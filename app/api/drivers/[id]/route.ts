import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { updateEntityStatus } from "@/lib/statusEngine";

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
  const { name, email, phone, cdl_number } = body;

  // Verify driver ownership through fleet
  const { data: driver } = await supabase
    .from("drivers")
    .select("fleet_id")
    .eq("id", params.id)
    .single();

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Verify fleet ownership
  const { data: fleet } = await supabase
    .from("fleets")
    .select("id")
    .eq("id", driver.fleet_id)
    .eq("owner_id", user.id)
    .single();

  if (!fleet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Update driver (status ignored - will be recalculated)
  const { data, error } = await supabase
    .from("drivers")
    .update({
      name,
      email: email || null,
      phone: phone || null,
      cdl_number: cdl_number || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Recalculate status based on documents
  try {
    await updateEntityStatus("driver", params.id, driver.fleet_id);
    
    // Re-fetch updated driver
    const { data: updatedDriver } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", params.id)
      .single();
    
    return NextResponse.json(updatedDriver || data);
  } catch (statusError) {
    // If status calculation fails, return driver anyway
    console.error("Failed to calculate driver status:", statusError);
    return NextResponse.json(data);
  }
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

  // Verify driver ownership through fleet
  const { data: driver } = await supabase
    .from("drivers")
    .select("fleet_id")
    .eq("id", params.id)
    .single();

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Verify fleet ownership
  const { data: fleet } = await supabase
    .from("fleets")
    .select("id")
    .eq("id", driver.fleet_id)
    .eq("owner_id", user.id)
    .single();

  if (!fleet) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("drivers")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
