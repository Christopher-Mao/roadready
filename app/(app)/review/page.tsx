import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReviewQueueClient from "./ReviewQueueClient";

export default async function ReviewQueuePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's fleet
  const { data: fleet } = await supabase
    .from("fleets")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!fleet) {
    redirect("/dashboard");
  }

  // Get documents that need review
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("fleet_id", fleet.id)
    .eq("needs_review", true)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Error fetching documents for review:", error);
  }

  // Get entity names for display
  const entityMap = new Map<string, { name: string; type: "driver" | "vehicle" }>();

  if (documents && documents.length > 0) {
    const driverIds = documents
      .filter((d) => d.entity_type === "driver")
      .map((d) => d.entity_id);
    const vehicleIds = documents
      .filter((d) => d.entity_type === "vehicle")
      .map((d) => d.entity_id);

    if (driverIds.length > 0) {
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, name")
        .in("id", driverIds);

      drivers?.forEach((driver) => {
        entityMap.set(`driver:${driver.id}`, {
          name: driver.name,
          type: "driver",
        });
      });
    }

    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, unit_number")
        .in("id", vehicleIds);

      vehicles?.forEach((vehicle) => {
        entityMap.set(`vehicle:${vehicle.id}`, {
          name: vehicle.unit_number,
          type: "vehicle",
        });
      });
    }
  }

  return (
    <ReviewQueueClient
      documents={documents || []}
      entityMap={Object.fromEntries(entityMap)}
    />
  );
}
