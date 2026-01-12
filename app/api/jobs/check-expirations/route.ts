import { createAdminClient } from "@/lib/supabase/admin";
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
  const isLocalhost = request.headers.get("host")?.includes("localhost") || 
                      request.headers.get("host")?.includes("127.0.0.1");
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Allow localhost access in development without auth
  // In production, require CRON_SECRET
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET && !(isLocalhost && isDevelopment)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
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
        // Use expiration_date if available, fallback to expires_on
        const { data: documents, error: docsError } = await supabase
          .from("documents")
          .select("*")
          .eq("fleet_id", fleet.id)
          .or("expiration_date.not.is.null,expires_on.not.is.null");

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
          // Use expiration_date if available, fallback to expires_on
          const expirationValue = (doc as any).expiration_date || doc.expires_on;
          if (!expirationValue) return;

          const expirationDate = new Date(expirationValue);
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
          
          // Select correct columns based on entity type
          const selectColumns = entityType === "driver" 
            ? "id, name" 
            : "id, unit_number";

          const { data: entity, error: entityError } = await supabase
            .from(table)
            .select(selectColumns)
            .eq("id", entityId)
            .single();

          if (entityError) {
            console.error(`Failed to fetch ${entityType} ${entityId}:`, entityError);
            results.errors.push(`Fleet ${fleet.id}: Failed to fetch ${entityType} ${entityId} - ${entityError.message}`);
          }

          if (entity) {
            // Drivers have 'name', vehicles have 'unit_number'
            const displayName = entityType === "driver" 
              ? (entity as any).name 
              : (entity as any).unit_number;
            
            entityMap.set(entityKey, {
              name: displayName || "Unknown",
              type: entityType as "driver" | "vehicle",
            });
          } else if (!entityError) {
            // Entity not found (but no error means it just doesn't exist)
            console.warn(`Entity not found: ${entityType} ${entityId}`);
            results.errors.push(`Fleet ${fleet.id}: ${entityType} ${entityId} not found`);
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

          if (!entity) {
            console.warn(`Skipping alert for document ${doc.id}: entity ${entityKey} not found`);
            results.errors.push(`Fleet ${fleet.id}: Skipped alert for document ${doc.id} - entity ${entityKey} not found`);
            continue;
          }

          // Send email alert
          const emailResult = await sendEmailAlert({
            to: ownerEmail,
            subject: `RoadReady: ${entity.type === "driver" ? "Driver" : "Vehicle"} "${entity.name}" - ${doc.doc_type} Expired`,
            body: `Document expired: ${doc.doc_type}`,
            entityType: entity.type,
            entityName: entity.name,
            documentType: doc.doc_type,
            expirationDate: (doc as any).expiration_date || doc.expires_on,
            reason: "expired",
          });

          // Track alert
          const { error: alertError } = await supabase.from("alerts").insert({
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

          if (alertError) {
            console.error(`Failed to log email alert for document ${doc.id}:`, alertError);
            results.errors.push(`Fleet ${fleet.id}: Failed to log alert - ${alertError.message}`);
          }

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

            const { error: smsAlertError } = await supabase.from("alerts").insert({
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

            if (smsAlertError) {
              console.error(`Failed to log SMS alert for document ${doc.id}:`, smsAlertError);
              results.errors.push(`Fleet ${fleet.id}: Failed to log SMS alert - ${smsAlertError.message}`);
            }

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
              const expirationValue = (doc as any).expiration_date || doc.expires_on;
              const expirationDate = new Date(expirationValue);
              const daysUntilExpiration = Math.ceil(
                (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );

              return {
                doc,
                entityType: doc.entity_type as "driver" | "vehicle",
                entityName: entity?.name || "Unknown",
                documentType: doc.doc_type,
                expirationDate: (doc as any).expiration_date || doc.expires_on,
                reason: "expiring_soon" as const,
                daysUntilExpiration,
              };
            });

          if (digestItems.length > 0) {
            const digestPayload = digestItems.map(({ doc, ...item }) => item);
            const digestResult = await sendDailyDigest(ownerEmail, digestPayload);

            // Track digest alert (always log, even if sending failed)
            // Mark all digest items as alerted
            for (const { doc } of digestItems) {
              const { error: digestAlertError } = await supabase.from("alerts").insert({
                fleet_id: fleet.id,
                channel: "email",
                to_address: ownerEmail,
                reason: "expiring_soon",
                entity_type: doc.entity_type,
                entity_id: doc.entity_id,
                document_id: doc.id,
                status: digestResult.success ? "sent" : "failed",
                error: digestResult.error || null,
                sent_at: digestResult.success ? new Date().toISOString() : null,
              });

              if (digestAlertError) {
                console.error(`Failed to log digest alert for document ${doc.id}:`, digestAlertError);
                results.errors.push(`Fleet ${fleet.id}: Failed to log digest alert - ${digestAlertError.message}`);
              }
            }
            
            if (digestResult.success) {
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
