import { createClient } from "@/lib/supabase/server";

/**
 * Required documents for MVP (hardcoded - can be made configurable later)
 */
const REQUIRED_DOCUMENTS = {
  driver: ["CDL", "Medical Card"],
  vehicle: ["Registration", "Insurance"],
} as const;

/**
 * Default expiration warning window in days
 */
const YELLOW_DAYS = 30;

export type EntityStatus = "green" | "yellow" | "red";

interface Document {
  id: string;
  doc_type: string;
  expires_on: string | null;
  status: EntityStatus;
}

interface StatusResult {
  status: EntityStatus;
  reason?: string;
  missingDocs?: string[];
  expiredDocs?: string[];
  expiringSoonDocs?: Array<{ doc_type: string; expires_on: string; days_remaining: number }>;
}

/**
 * Calculate status for a driver or vehicle based on their documents
 */
export async function calculateEntityStatus(
  entityType: "driver" | "vehicle",
  entityId: string,
  fleetId: string
): Promise<StatusResult> {
  const supabase = await createClient();

  // Get all documents for this entity
  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, doc_type, expires_on, status")
    .eq("fleet_id", fleetId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  const docs = (documents || []) as Document[];
  const requiredDocTypes = REQUIRED_DOCUMENTS[entityType];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find documents by type (case-insensitive matching)
  const docMap = new Map<string, Document[]>();
  docs.forEach((doc) => {
    const normalizedType = doc.doc_type.trim().toLowerCase();
    if (!docMap.has(normalizedType)) {
      docMap.set(normalizedType, []);
    }
    docMap.get(normalizedType)!.push(doc);
  });

  // Check for missing required documents
  const missingDocs: string[] = [];
  requiredDocTypes.forEach((requiredType) => {
    const normalizedType = requiredType.toLowerCase();
    if (!docMap.has(normalizedType) || docMap.get(normalizedType)!.length === 0) {
      missingDocs.push(requiredType);
    }
  });

  // Check for expired and expiring documents
  const expiredDocs: string[] = [];
  const expiringSoonDocs: Array<{ doc_type: string; expires_on: string; days_remaining: number }> = [];

  docs.forEach((doc) => {
    if (!doc.expires_on) return;

    const expirationDate = new Date(doc.expires_on);
    expirationDate.setHours(0, 0, 0, 0);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if this is a required document
    const isRequired = requiredDocTypes.some(
      (reqType) => reqType.toLowerCase() === doc.doc_type.trim().toLowerCase()
    );

    if (daysUntilExpiration < 0 && isRequired) {
      // Expired required document
      if (!expiredDocs.includes(doc.doc_type)) {
        expiredDocs.push(doc.doc_type);
      }
    } else if (daysUntilExpiration >= 0 && daysUntilExpiration <= YELLOW_DAYS) {
      // Expiring soon (any document, not just required)
      if (isRequired) {
        expiringSoonDocs.push({
          doc_type: doc.doc_type,
          expires_on: doc.expires_on,
          days_remaining: daysUntilExpiration,
        });
      }
    }
  });

  // Determine status
  let status: EntityStatus;
  let reason: string | undefined;

  if (missingDocs.length > 0) {
    status = "red";
    reason = `Missing required documents: ${missingDocs.join(", ")}`;
  } else if (expiredDocs.length > 0) {
    status = "red";
    reason = `Expired documents: ${expiredDocs.join(", ")}`;
  } else if (expiringSoonDocs.length > 0) {
    status = "yellow";
    const earliestExpiring = expiringSoonDocs.sort((a, b) => a.days_remaining - b.days_remaining)[0];
    reason = `${earliestExpiring.doc_type} expires in ${earliestExpiring.days_remaining} days`;
  } else {
    status = "green";
    reason = "All required documents present and valid";
  }

  return {
    status,
    reason,
    missingDocs: missingDocs.length > 0 ? missingDocs : undefined,
    expiredDocs: expiredDocs.length > 0 ? expiredDocs : undefined,
    expiringSoonDocs: expiringSoonDocs.length > 0 ? expiringSoonDocs : undefined,
  };
}

/**
 * Update entity status in database based on calculated status
 */
export async function updateEntityStatus(
  entityType: "driver" | "vehicle",
  entityId: string,
  fleetId: string
): Promise<StatusResult> {
  const supabase = await createClient();

  // Calculate status
  const statusResult = await calculateEntityStatus(entityType, entityId, fleetId);

  // Update entity status in database
  const table = entityType === "driver" ? "drivers" : "vehicles";
  const { error } = await supabase
    .from(table)
    .update({
      status: statusResult.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entityId)
    .eq("fleet_id", fleetId);

  if (error) {
    throw new Error(`Failed to update ${entityType} status: ${error.message}`);
  }

  return statusResult;
}
