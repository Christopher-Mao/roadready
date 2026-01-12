import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring system status.
 * Returns status of database, storage, and notification services.
 */
export async function GET(request: NextRequest) {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "unknown", error: null as string | null },
      storage: { status: "unknown", error: null as string | null },
      email: { status: "unknown", error: null as string | null },
      sms: { status: "unknown", error: null as string | null },
    },
    metrics: {
      totalFleets: 0,
      totalDrivers: 0,
      totalVehicles: 0,
      totalDocuments: 0,
      pendingReviews: 0,
      failedAlerts24h: 0,
    },
  };

  try {
    const supabase = createAdminClient();

    // Check database connection
    try {
      const { error: dbError } = await supabase.from("fleets").select("id").limit(1);
      if (dbError) {
        health.services.database = { status: "unhealthy", error: dbError.message };
        health.status = "degraded";
      } else {
        health.services.database = { status: "healthy", error: null };
      }
    } catch (err: any) {
      health.services.database = { status: "unhealthy", error: err.message };
      health.status = "unhealthy";
    }

    // Check storage (try to list buckets)
    try {
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      if (storageError) {
        health.services.storage = { status: "unhealthy", error: storageError.message };
        health.status = "degraded";
      } else {
        const uploadsBucket = buckets?.find((b) => b.name === "uploads");
        if (uploadsBucket) {
          health.services.storage = { status: "healthy", error: null };
        } else {
          health.services.storage = { status: "degraded", error: "uploads bucket not found" };
          health.status = "degraded";
        }
      }
    } catch (err: any) {
      health.services.storage = { status: "unhealthy", error: err.message };
      health.status = "degraded";
    }

    // Check email service (check env vars)
    if (process.env.RESEND_API_KEY) {
      health.services.email = { status: "configured", error: null };
    } else {
      health.services.email = { status: "not_configured", error: "RESEND_API_KEY not set" };
      health.status = "degraded";
    }

    // Check SMS service (check env vars)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
      health.services.sms = { status: "configured", error: null };
    } else {
      health.services.sms = { status: "not_configured", error: "Twilio credentials not set" };
      // SMS is optional, so don't mark as degraded
    }

    // Get metrics (only if database is healthy)
    if (health.services.database.status === "healthy") {
      try {
        const [fleetsResult, driversResult, vehiclesResult, documentsResult, reviewsResult, alertsResult] = await Promise.all([
          supabase.from("fleets").select("id", { count: "exact", head: true }),
          supabase.from("drivers").select("id", { count: "exact", head: true }),
          supabase.from("vehicles").select("id", { count: "exact", head: true }),
          supabase.from("documents").select("id", { count: "exact", head: true }),
          supabase.from("documents").select("id", { count: "exact", head: true }).eq("needs_review", true),
          supabase
            .from("alerts")
            .select("id", { count: "exact", head: true })
            .eq("status", "failed")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        ]);

        health.metrics.totalFleets = fleetsResult.count || 0;
        health.metrics.totalDrivers = driversResult.count || 0;
        health.metrics.totalVehicles = vehiclesResult.count || 0;
        health.metrics.totalDocuments = documentsResult.count || 0;
        health.metrics.pendingReviews = reviewsResult.count || 0;
        health.metrics.failedAlerts24h = alertsResult.count || 0;
      } catch (metricsError: any) {
        console.error("Failed to fetch metrics:", metricsError);
        // Don't fail health check if metrics fail
      }
    }

    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message || "Internal server error",
      },
      { status: 503 }
    );
  }
}
