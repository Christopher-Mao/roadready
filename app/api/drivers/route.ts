import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { updateEntityStatus } from "@/lib/statusEngine";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fleet_id, name, email, phone, cdl_number } = body;

  // Verify fleet ownership
  const { data: fleet } = await supabase
    .from("fleets")
    .select("id")
    .eq("id", fleet_id)
    .eq("owner_id", user.id)
    .single();

  if (!fleet) {
    return NextResponse.json({ error: "Fleet not found" }, { status: 404 });
  }

  // Create driver (status will be calculated)
  const { data, error } = await supabase
    .from("drivers")
    .insert({
      fleet_id,
      name,
      email: email || null,
      phone: phone || null,
      cdl_number: cdl_number || null,
      status: "red", // Default to red (will be recalculated if documents exist)
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Recalculate status based on documents (may still be red if no docs)
  try {
    await updateEntityStatus("driver", data.id, fleet_id);
    
    // Re-fetch updated driver
    const { data: updatedDriver } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", data.id)
      .single();
    
    return NextResponse.json(updatedDriver || data);
  } catch (statusError) {
    // If status calculation fails, return driver anyway (status will be red)
    console.error("Failed to calculate driver status:", statusError);
    return NextResponse.json(data);
  }
}
