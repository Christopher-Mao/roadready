import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's fleet
  const { data: fleet } = await supabase
    .from("fleets")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  // If no fleet exists, create one
  let fleetId = fleet?.id;
  if (!fleet) {
    const { data: newFleet, error } = await supabase
      .from("fleets")
      .insert({
        name: "My Fleet",
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating fleet:", error);
    } else {
      fleetId = newFleet?.id;
    }
  } else {
    fleetId = fleet.id;
  }

  // Get drivers and vehicles for this fleet
  const [driversResult, vehiclesResult] = await Promise.all([
    supabase
      .from("drivers")
      .select("id, status")
      .eq("fleet_id", fleetId),
    supabase
      .from("vehicles")
      .select("id, status")
      .eq("fleet_id", fleetId),
  ]);

  const drivers = driversResult.data || [];
  const vehicles = vehiclesResult.data || [];

  // Calculate stats
  const allEntities = [...drivers, ...vehicles];
  const stats = {
    green: allEntities.filter((e) => e.status === "green").length,
    yellow: allEntities.filter((e) => e.status === "yellow").length,
    red: allEntities.filter((e) => e.status === "red").length,
    total: allEntities.length,
  };

  return (
    <DashboardClient
      fleetName={fleet?.name || "My Fleet"}
      stats={stats}
      driverCount={drivers.length}
      vehicleCount={vehicles.length}
    />
  );
}
