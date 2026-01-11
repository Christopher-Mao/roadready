import { createClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendEmailAlert, sendDailyDigest } from "@/lib/notifications/email";
import { sendSMSAlert } from "@/lib/notifications/sms";

/**
 * GET /api/jobs/check-expirations
 * 
 * Background job called by Vercel Cron to check for expiring/expired documents
 * and send alerts (email + SMS) to fleet owners.
 * 
 * This should be called daily (e.g., 7am) via Vercel Cron.
 * 
 * Cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/jobs/check-expirations",
 *     "schedule": "0 7 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron job request (prevent unauthorized access)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // For development, allow without secret if not set
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Get all fleets
    const { data: fleets, error: fleetsError } = await supabase
      .from("fleets")
      .select("id, owner_id, name");

    if (fleetsError) {
      throw new Error(`Failed to fetch fleets: ${fleetsError.message}`);
    }

    if (!fleets || fleets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No fleets found",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      alertsSent: 0,
      errors: [] as string[],
    };

    // Process each fleet
    for (const fleet of fleets) {
      try {
        // Get fleet owner email and phone
        const { data: owner, error: ownerError } = await supabase.auth.admin.getUserById(
          fleet.owner_id
        );

        if (ownerError || !owner.user) {
          results.errors.push(`Fleet ${fleet.id}: Owner not found`);
          continue;
        }

        const ownerEmail = owner.user.email;
        const ownerPhone = owner.user.user_metadata?.phone;

        if (!ownerEmail) {
          results.errors.push(`Fleet ${fleet.id}: Owner email not found`);
          continue;
        }

        // Get all documents for this fleet
        const { data: documents, error: docsError } = await supabase
          .from("documents")
          .select("*")
          .eq("fleet_id", fleet.id)
          .not("expires_on", "is", null);

        if (docsError) {
          results.errors.push(`Fleet ${fleet.id}: ${docsError.message}`);
          continue;
        }

        if (!documents || documents.length === 0) {
          continue; // No documents with expiration dates
        }

        // Categorize documents
        const expiredDocs: typeof documents = [];
        const expiringSoonDocs: typeof documents = [];

        documents.forEach((doc) => {
          const expirationDate = new Date(doc.expires_on);
          expirationDate.setHours(0, 0, 0, 0);
          const daysUntilExpiration = Math.ceil(
            (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiration < 0) {
            expiredDocs.push(doc);
          } else if (daysUntilExpiration <= 30) {
            expiringSoonDocs.push(doc);
          }
        });

        // Get entities for context
        const entityIds = new Set<string>();
        documents.forEach((doc) => {
          entityIds.add(`${doc.entity_type}:${doc.entity_id}`);
        });

        const entityMap = new Map<string, { name: string; type: "driver" | "vehicle" }>();

        for (const entityKey of entityIds) {
          const [entityType, entityId] = entityKey.split(":");
          const table = entityType === "driver" ? "drivers" : "vehicles";

          const { data: entity } = await supabase
            .from(table)
            .select("id, name, unit_number")
            .eq("id", entityId)
            .single();

          if (entity) {
            entityMap.set(entityKey, {
              name: entity.name || entity.unit_number || "Unknown",
              type: entityType as "driver" | "vehicle",
            });
          }
        }

        // Check for recent alerts (avoid duplicates within 24h)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: recentAlerts } = await supabase
          .from("alerts")
          .select("document_id")
          .eq("fleet_id", fleet.id)
          .gte("created_at", yesterday.toISOString());

        const recentDocIds = new Set(recentAlerts?.map((a) => a.document_id) || []);

        // Send immediate alerts for expired documents
        for (const doc of expiredDocs) {
          if (recentDocIds.has(doc.id)) {
            continue; // Already alerted recently
          }

          const entityKey = `${doc.entity_type}:${doc.entity_id}`;
          const entity = entityMap.get(entityKey);

          if (!entity) continue;

          // Send email alert
          const emailResult = await sendEmailAlert({
            to: ownerEmail,
            subject: `RoadReady: ${entity.type === "driver" ? "Driver" : "Vehicle"} "${entity.name}" - ${doc.doc_type} Expired`,
            body: `Document expired: ${doc.doc_type}`,
            entityType: entity.type,
            entityName: entity.name,
            documentType: doc.doc_type,
            expirationDate: doc.expires_on,
            reason: "expired",
          });

          // Track alert
          await supabase.from("alerts").insert({
            fleet_id: fleet.id,
            channel: "email",
            to_address: ownerEmail,
            reason: "expired",
            entity_type: doc.entity_type,
            entity_id: doc.entity_id,
            document_id: doc.id,
            status: emailResult.success ? "sent" : "failed",
            error: emailResult.error || null,
            sent_at: emailResult.success ? new Date().toISOString() : null,
          });

          if (emailResult.success) {
            results.alertsSent++;
          }

          // Send SMS alert for expired (only if phone is configured)
          if (ownerPhone && process.env.TWILIO_ACCOUNT_SID) {
            const smsResult = await sendSMSAlert({
              to: ownerPhone,
              entityType: entity.type,
              entityName: entity.name,
              documentType: doc.doc_type,
              expirationDate: doc.expires_on,
              reason: "expired",
            });

            await supabase.from("alerts").insert({
              fleet_id: fleet.id,
              channel: "sms",
              to_address: ownerPhone,
              reason: "expired",
              entity_type: doc.entity_type,
              entity_id: doc.entity_id,
              document_id: doc.id,
              status: smsResult.success ? "sent" : "failed",
              error: smsResult.error || null,
              sent_at: smsResult.success ? new Date().toISOString() : null,
            });

            if (smsResult.success) {
              results.alertsSent++;
            }
          }
        }

        // Send daily digest for expiring soon documents
        if (expiringSoonDocs.length > 0) {
          const digestItems = expiringSoonDocs
            .filter((doc) => !recentDocIds.has(doc.id)) // Don't include recently alerted
            .map((doc) => {
              const entityKey = `${doc.entity_type}:${doc.entity_id}`;
              const entity = entityMap.get(entityKey);
              const expirationDate = new Date(doc.expires_on);
              const daysUntilExpiration = Math.ceil(
                (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );

              return {
                doc,
                entityType: doc.entity_type as "driver" | "vehicle",
                entityName: entity?.name || "Unknown",
                documentType: doc.doc_type,
                expirationDate: doc.expires_on,
                reason: "expiring_soon" as const,
                daysUntilExpiration,
              };
            });

          if (digestItems.length > 0) {
            const digestPayload = digestItems.map(({ doc, ...item }) => item);
            const digestResult = await sendDailyDigest(ownerEmail, digestPayload);

            // Track digest alert (one per day per fleet)
            if (digestResult.success) {
              // Mark all digest items as alerted
              for (const { doc } of digestItems) {
                await supabase.from("alerts").insert({
                  fleet_id: fleet.id,
                  channel: "email",
                  to_address: ownerEmail,
                  reason: "expiring_soon",
                  entity_type: doc.entity_type,
                  entity_id: doc.entity_id,
                  document_id: doc.id,
                  status: "sent",
                  sent_at: new Date().toISOString(),
                });
              }
              results.alertsSent++;
            }
          }
        }

        results.processed++;
      } catch (fleetError: any) {
        results.errors.push(`Fleet ${fleet.id}: ${fleetError.message}`);
        console.error(`Error processing fleet ${fleet.id}:`, fleetError);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Check expirations error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
