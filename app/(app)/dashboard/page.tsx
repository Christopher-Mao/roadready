import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { updateEntityStatus } from "@/lib/statusEngine";

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
      .select("id, name, status")
      .eq("fleet_id", fleetId),
    supabase
      .from("vehicles")
      .select("id, unit_number, status")
      .eq("fleet_id", fleetId),
  ]);

  const drivers = driversResult.data || [];
  const vehicles = vehiclesResult.data || [];

  // Recalculate statuses for all entities to ensure accuracy
  // (In production, this could be optimized with caching or async recalculation)
  if (fleetId) {
    await Promise.all([
      ...drivers.map((driver) =>
        updateEntityStatus("driver", driver.id, fleetId).catch((err) => {
          console.error(`Failed to recalculate status for driver ${driver.id}:`, err);
        })
      ),
      ...vehicles.map((vehicle) =>
        updateEntityStatus("vehicle", vehicle.id, fleetId).catch((err) => {
          console.error(`Failed to recalculate status for vehicle ${vehicle.id}:`, err);
        })
      ),
    ]);

    // Re-fetch updated statuses
    const [updatedDriversResult, updatedVehiclesResult] = await Promise.all([
      supabase
        .from("drivers")
        .select("id, status")
        .eq("fleet_id", fleetId),
      supabase
        .from("vehicles")
        .select("id, status")
        .eq("fleet_id", fleetId),
    ]);

    const updatedDrivers = updatedDriversResult.data || [];
    const updatedVehicles = updatedVehiclesResult.data || [];

    // Calculate stats from updated data
    const allEntities = [...updatedDrivers, ...updatedVehicles];
    const stats = {
      green: allEntities.filter((e) => e.status === "green").length,
      yellow: allEntities.filter((e) => e.status === "yellow").length,
      red: allEntities.filter((e) => e.status === "red").length,
      total: allEntities.length,
    };

    // Re-fetch full data for display
    const [fullDriversResult, fullVehiclesResult] = await Promise.all([
      supabase
        .from("drivers")
        .select("id, name, status")
        .eq("fleet_id", fleetId),
      supabase
        .from("vehicles")
        .select("id, unit_number, status")
        .eq("fleet_id", fleetId),
    ]);

    return (
      <DashboardClient
        fleetName={fleet?.name || "My Fleet"}
        stats={stats}
        driverCount={updatedDrivers.length}
        vehicleCount={updatedVehicles.length}
        drivers={fullDriversResult.data || []}
        vehicles={fullVehiclesResult.data || []}
      />
    );
  }

  // Fallback (shouldn't happen, but just in case)
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
      drivers={drivers}
      vehicles={vehicles}
    />
  );
}
