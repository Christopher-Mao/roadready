import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fleet_id, name, email, phone, cdl_number, status } = body;

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

  const { data, error } = await supabase
    .from("drivers")
    .insert({
      fleet_id,
      name,
      email: email || null,
      phone: phone || null,
      cdl_number: cdl_number || null,
      status: status || "green",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
