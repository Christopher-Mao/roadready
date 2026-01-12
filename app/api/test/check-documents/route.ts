import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/test/check-documents
 * 
 * Diagnostic endpoint to check what documents exist and their expiration status
 * This helps debug why alerts might not be sending.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all fleets
    const { data: fleets, error: fleetsError } = await supabase
      .from("fleets")
      .select("id, owner_id, name");

    if (fleetsError) {
      return NextResponse.json(
        { error: `Failed to fetch fleets: ${fleetsError.message}` },
        { status: 500 }
      );
    }

    if (!fleets || fleets.length === 0) {
      return NextResponse.json({
        message: "No fleets found",
        fleets: [],
      });
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      today: today.toISOString(),
      fleets: [] as any[],
    };

    // Check each fleet
    for (const fleet of fleets) {
      const fleetData: any = {
        fleetId: fleet.id,
        fleetName: fleet.name,
        ownerId: fleet.owner_id,
        documents: {
          total: 0,
          withExpiration: 0,
          expired: 0,
          expiringSoon: 0,
          valid: 0,
          list: [] as any[],
        },
        owner: null as any,
      };

      // Get owner info
      try {
        const { data: owner } = await supabase.auth.admin.getUserById(fleet.owner_id);
        if (owner?.user) {
          fleetData.owner = {
            email: owner.user.email,
            phone: owner.user.user_metadata?.phone || "Not set",
          };
        }
      } catch (error: any) {
        fleetData.ownerError = error.message;
      }

      // Get all documents for this fleet
      const { data: documents, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("fleet_id", fleet.id);

      if (docsError) {
        fleetData.documentsError = docsError.message;
        diagnostics.fleets.push(fleetData);
        continue;
      }

      fleetData.documents.total = documents?.length || 0;

      // Analyze documents
      if (documents) {
        documents.forEach((doc) => {
          const docInfo: any = {
            id: doc.id,
            docType: doc.doc_type,
            entityType: doc.entity_type,
            entityId: doc.entity_id,
            hasExpiration: !!doc.expires_on,
            expirationDate: doc.expires_on,
            status: doc.status,
          };

          if (doc.expires_on) {
            fleetData.documents.withExpiration++;
            const expirationDate = new Date(doc.expires_on);
            expirationDate.setHours(0, 0, 0, 0);
            const daysUntilExpiration = Math.ceil(
              (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            docInfo.daysUntilExpiration = daysUntilExpiration;

            if (daysUntilExpiration < 0) {
              fleetData.documents.expired++;
              docInfo.alertReason = "expired";
            } else if (daysUntilExpiration <= 30) {
              fleetData.documents.expiringSoon++;
              docInfo.alertReason = "expiring_soon";
            } else {
              fleetData.documents.valid++;
              docInfo.alertReason = "none";
            }
          } else {
            docInfo.alertReason = "no_expiration";
          }

          fleetData.documents.list.push(docInfo);
        });
      }

      // Check for recent alerts (duplicate prevention)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentAlerts } = await supabase
        .from("alerts")
        .select("id, document_id, reason, created_at")
        .eq("fleet_id", fleet.id)
        .gte("created_at", yesterday.toISOString());

      fleetData.recentAlerts = {
        count: recentAlerts?.length || 0,
        alerts: recentAlerts || [],
      };

      // Determine if alerts should be sent
      const expiredDocs = fleetData.documents.list.filter((d: any) => d.alertReason === "expired");
      const expiringDocs = fleetData.documents.list.filter((d: any) => d.alertReason === "expiring_soon");
      
      fleetData.wouldTriggerAlerts = {
        expired: expiredDocs.length > 0 && expiredDocs.some((d: any) => 
          !recentAlerts?.some(a => a.document_id === d.id && a.reason === "expired")
        ),
        expiringSoon: expiringDocs.length > 0 && !recentAlerts?.some(a => a.reason === "expiring_soon"),
      };

      diagnostics.fleets.push(fleetData);
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
