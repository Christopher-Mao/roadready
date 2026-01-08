import { createClient } from "@/lib/supabase/server";

/**
 * Upload a file to Supabase Storage
 * @param file - File to upload
 * @param userId - User ID (for folder structure)
 * @param fleetId - Fleet ID (for folder structure)
 * @param entityType - 'driver' or 'vehicle'
 * @param entityId - ID of the driver or vehicle
 * @param fileName - Name for the file
 * @returns File path in storage
 */
export async function uploadFile(
  file: File,
  userId: string,
  fleetId: string,
  entityType: "driver" | "vehicle",
  entityId: string,
  fileName: string
): Promise<string> {
  const supabase = await createClient();

  // Create path: {userId}/{fleetId}/{entityType}/{entityId}/{fileName}
  const filePath = `${userId}/${fleetId}/${entityType}/${entityId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return data.path;
}

/**
 * Get a signed URL for a file in storage
 * @param filePath - Path to the file in storage
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage
 * @param filePath - Path to the file in storage
 */
export async function deleteFile(filePath: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from("uploads")
    .remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * List files in a directory
 * @param userId - User ID
 * @param fleetId - Fleet ID
 * @param entityType - 'driver' or 'vehicle'
 * @param entityId - ID of the driver or vehicle
 * @returns Array of file paths
 */
export async function listFiles(
  userId: string,
  fleetId: string,
  entityType: "driver" | "vehicle",
  entityId: string
): Promise<string[]> {
  const supabase = await createClient();

  const folderPath = `${userId}/${fleetId}/${entityType}/${entityId}/`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .list(folderPath, {
      limit: 100,
      offset: 0,
    });

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data.map((file) => `${folderPath}${file.name}`);
}
