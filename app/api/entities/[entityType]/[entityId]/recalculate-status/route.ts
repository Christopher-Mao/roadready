import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateEntityStatus } from "@/lib/statusEngine";

/**
 * POST /api/entities/driver/[id]/recalculate-status
 * POST /api/entities/vehicle/[id]/recalculate-status
 * 
 * Recalculates and updates the status for a driver or vehicle based on their documents
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { entityType: string; entityId: string } }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate entity type
    if (params.entityType !== "driver" && params.entityType !== "vehicle") {
      return NextResponse.json(
        { error: "Invalid entity type. Must be 'driver' or 'vehicle'" },
        { status: 400 }
      );
    }

    // Get user's fleet
    const { data: fleet } = await supabase
      .from("fleets")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!fleet) {
      return NextResponse.json(
        { error: "Fleet not found" },
        { status: 404 }
      );
    }

    // Verify entity belongs to user's fleet
    const entityTable = params.entityType === "driver" ? "drivers" : "vehicles";
    const { data: entity, error: entityError } = await supabase
      .from(entityTable)
      .select("id")
      .eq("id", params.entityId)
      .eq("fleet_id", fleet.id)
      .single();

    if (entityError || !entity) {
      return NextResponse.json(
        { error: `${params.entityType} not found or access denied` },
        { status: 404 }
      );
    }

    // Calculate and update status
    const statusResult = await updateEntityStatus(
      params.entityType as "driver" | "vehicle",
      params.entityId,
      fleet.id
    );

    return NextResponse.json(statusResult);
  } catch (error: any) {
    console.error("Recalculate status error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
