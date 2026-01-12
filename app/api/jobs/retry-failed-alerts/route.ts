import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendEmailAlert, sendDailyDigest } from "@/lib/notifications/email";
import { sendSMSAlert } from "@/lib/notifications/sms";

/**
 * GET /api/jobs/retry-failed-alerts
 * 
 * Retry sending failed alerts from the last 24 hours.
 * This should be called periodically (e.g., every hour) via Vercel Cron.
 * 
 * Cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/jobs/retry-failed-alerts",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron job request
  const authHeader = request.headers.get("authorization");
  const isLocalhost = request.headers.get("host")?.includes("localhost") || 
                      request.headers.get("host")?.includes("127.0.0.1");
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET && !(isLocalhost && isDevelopment)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  try {
    // Get failed alerts from the last 24 hours
    const { data: failedAlerts, error: fetchError } = await supabase
      .from("alerts")
      .select("*")
      .eq("status", "failed")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: true })
      .limit(50); // Limit retries to prevent spam

    if (fetchError) {
      throw new Error(`Failed to fetch failed alerts: ${fetchError.message}`);
    }

    if (!failedAlerts || failedAlerts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No failed alerts to retry",
        retried: 0,
        stillFailed: 0,
      });
    }

    const results = {
      retried: 0,
      stillFailed: 0,
      errors: [] as string[],
    };

    // Group alerts by fleet to avoid duplicate sends
    const fleetAlerts = new Map<string, typeof failedAlerts>();
    for (const alert of failedAlerts) {
      if (!fleetAlerts.has(alert.fleet_id)) {
        fleetAlerts.set(alert.fleet_id, []);
      }
      fleetAlerts.get(alert.fleet_id)!.push(alert);
    }

    // Retry each failed alert
    for (const [fleetId, alerts] of fleetAlerts) {
      try {
        // Get fleet owner
        const { data: fleet } = await supabase
          .from("fleets")
          .select("id, owner_id")
          .eq("id", fleetId)
          .single();

        if (!fleet) {
          results.errors.push(`Fleet ${fleetId}: Not found`);
          continue;
        }

        const { data: owner } = await supabase.auth.admin.getUserById(fleet.owner_id);
        if (!owner.user) {
          results.errors.push(`Fleet ${fleetId}: Owner not found`);
          continue;
        }

        const ownerEmail = owner.user.email;
        const ownerPhone = owner.user.user_metadata?.phone;

        // Retry each alert
        for (const alert of alerts) {
          try {
            let retryResult: { success: boolean; error?: string } = { success: false };

            if (alert.channel === "email") {
              // Get document details for email
              let documentType = "Document";
              let entityName = "Unknown";
              let expirationDate: string | null = null;

              if (alert.document_id) {
                const { data: doc } = await supabase
                  .from("documents")
                  .select("doc_type, expires_on, entity_type, entity_id")
                  .eq("id", alert.document_id)
                  .single();

                if (doc) {
                  documentType = doc.doc_type;
                  expirationDate = doc.expires_on;

                  // Get entity name
                  const table = doc.entity_type === "driver" ? "drivers" : "vehicles";
                  const selectCol = doc.entity_type === "driver" ? "name" : "unit_number";
                  const { data: entity } = await supabase
                    .from(table)
                    .select(selectCol)
                    .eq("id", doc.entity_id)
                    .single();

                  if (entity) {
                    entityName = entity[selectCol];
                  }
                }
              }

              if (alert.reason === "expired") {
                retryResult = await sendEmailAlert({
                  to: ownerEmail!,
                  entityType: alert.entity_type as "driver" | "vehicle",
                  entityName,
                  documentType,
                  expirationDate,
                  reason: "expired",
                });
              } else if (alert.reason === "expiring_soon") {
                // For expiring soon, we'd need to reconstruct the digest
                // For simplicity, send individual alert
                retryResult = await sendEmailAlert({
                  to: ownerEmail!,
                  entityType: alert.entity_type as "driver" | "vehicle",
                  entityName,
                  documentType,
                  expirationDate,
                  reason: "expiring_soon",
                });
              }
            } else if (alert.channel === "sms" && ownerPhone) {
              // Get document details for SMS
              let documentType = "Document";
              let entityName = "Unknown";
              let expirationDate: string | null = null;

              if (alert.document_id) {
                const { data: doc } = await supabase
                  .from("documents")
                  .select("doc_type, expires_on, entity_type, entity_id")
                  .eq("id", alert.document_id)
                  .single();

                if (doc) {
                  documentType = doc.doc_type;
                  expirationDate = doc.expires_on;

                  const table = doc.entity_type === "driver" ? "drivers" : "vehicles";
                  const selectCol = doc.entity_type === "driver" ? "name" : "unit_number";
                  const { data: entity } = await supabase
                    .from(table)
                    .select(selectCol)
                    .eq("id", doc.entity_id)
                    .single();

                  if (entity) {
                    entityName = entity[selectCol];
                  }
                }
              }

              retryResult = await sendSMSAlert({
                to: ownerPhone,
                entityType: alert.entity_type as "driver" | "vehicle",
                entityName,
                documentType,
                expirationDate,
                reason: alert.reason as "expired" | "expiring_soon",
              });
            }

            // Update alert status
            const { error: updateError } = await supabase
              .from("alerts")
              .update({
                status: retryResult.success ? "sent" : "failed",
                error: retryResult.error || null,
                sent_at: retryResult.success ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", alert.id);

            if (updateError) {
              results.errors.push(`Alert ${alert.id}: Failed to update - ${updateError.message}`);
            } else if (retryResult.success) {
              results.retried++;
            } else {
              results.stillFailed++;
            }
          } catch (alertError: any) {
            results.errors.push(`Alert ${alert.id}: ${alertError.message}`);
            results.stillFailed++;
          }
        }
      } catch (fleetError: any) {
        results.errors.push(`Fleet ${fleetId}: ${fleetError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Retry failed alerts error:", error);
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
