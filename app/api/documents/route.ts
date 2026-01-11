import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/documents?entityType=driver&entityId=xxx - List documents for an entity
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (!["driver", "vehicle"].includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type. Must be 'driver' or 'vehicle'" },
        { status: 400 }
      );
    }

    // Verify entity belongs to user's fleet
    const entityTable = entityType === "driver" ? "drivers" : "vehicles";
    const { data: entity, error: entityError } = await supabase
      .from(entityTable)
      .select("id")
      .eq("id", entityId)
      .eq("fleet_id", fleet.id)
      .single();

    if (entityError || !entity) {
      return NextResponse.json(
        { error: `${entityType} not found or access denied` },
        { status: 404 }
      );
    }

    // Get documents
    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .eq("fleet_id", fleet.id)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch documents: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error: any) {
    console.error("List documents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
