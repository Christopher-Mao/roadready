import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { unit_number, vin, make, model, year, status } = body;

  // Verify vehicle ownership through fleet
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("fleet_id")
    .eq("id", params.id)
    .single();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // Verify fleet ownership
  const { data: fleet } = await supabase
    .from("fleets")
    .select("id")
    .eq("id", vehicle.fleet_id)
    .eq("owner_id", user.id)
    .single();

  if (!fleet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("vehicles")
    .update({
      unit_number,
      vin: vin || null,
      make: make || null,
      model: model || null,
      year: year || null,
      status: status || "green",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify vehicle ownership through fleet
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("fleet_id")
    .eq("id", params.id)
    .single();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // Verify fleet ownership
  const { data: fleet } = await supabase
    .from("fleets")
    .select("id")
    .eq("id", vehicle.fleet_id)
    .eq("owner_id", user.id)
    .single();

  if (!fleet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
