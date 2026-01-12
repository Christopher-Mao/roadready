import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import DocumentDetailClient from "./DocumentDetailClient";

export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  // Get document
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .eq("fleet_id", fleet.id)
    .single();

  if (docError || !document) {
    notFound();
  }

  // Get extraction if available
  let extraction = null;
  if (document.doc_type === "IRP_CAB_CARD") {
    const { data: extractionData } = await supabase
      .from("document_extractions")
      .select("*")
      .eq("document_id", params.id)
      .single();

    extraction = extractionData;
  }

  // Get entity name for display
  const entityTable = document.entity_type === "driver" ? "drivers" : "vehicles";
  const selectCol = document.entity_type === "driver" ? "name" : "unit_number";
  const { data: entity } = await supabase
    .from(entityTable)
    .select(selectCol)
    .eq("id", document.entity_id)
    .single();

  return (
    <DocumentDetailClient
      document={document}
      extraction={extraction}
      entityName={entity?.[selectCol] || "Unknown"}
      entityType={document.entity_type}
      entityId={document.entity_id}
    />
  );
}
