import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AuditTrailClient from "./AuditTrailClient";

export default async function AuditTrailPage() {
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

  // Get audit logs (document changes)
  const { data: auditLogs, error: auditError } = await supabase
    .from("document_audit_log")
    .select("*")
    .eq("fleet_id", fleet.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (auditError) {
    console.error("Error fetching audit logs:", auditError);
  }

  // Get alert logs
  const { data: alertLogs, error: alertError } = await supabase
    .from("alerts")
    .select("*")
    .eq("fleet_id", fleet.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (alertError) {
    console.error("Error fetching alert logs:", alertError);
  }

  // Get document details for display
  const documentIds = new Set(
    (auditLogs || [])
      .map((log) => log.document_id)
      .filter((id): id is string => id !== null)
  );

  let documentsMap: Record<string, any> = {};
  if (documentIds.size > 0) {
    const { data: documents } = await supabase
      .from("documents")
      .select("id, doc_type, entity_type, entity_id")
      .in("id", Array.from(documentIds));

    documents?.forEach((doc) => {
      documentsMap[doc.id] = doc;
    });
  }

  // Get entity names
  const entityMap = new Map<string, { name: string; type: "driver" | "vehicle" }>();
  const entityIds = new Set(
    Object.values(documentsMap)
      .map((d) => `${d.entity_type}:${d.entity_id}`)
      .filter((id): id is string => id !== null)
  );

  if (entityIds.size > 0) {
    const driverIds: string[] = [];
    const vehicleIds: string[] = [];

    entityIds.forEach((key) => {
      const [type, id] = key.split(":");
      if (type === "driver") driverIds.push(id);
      else if (type === "vehicle") vehicleIds.push(id);
    });

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
    <AuditTrailClient
      auditLogs={auditLogs || []}
      alertLogs={alertLogs || []}
      documentsMap={documentsMap}
      entityMap={Object.fromEntries(entityMap)}
    />
  );
}
