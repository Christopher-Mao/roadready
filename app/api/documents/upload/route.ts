import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's fleet
    const { data: fleet, error: fleetError } = await supabase
      .from("fleets")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (fleetError || !fleet) {
      return NextResponse.json(
        { error: "Fleet not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const entityType = formData.get("entityType") as string;
    const entityId = formData.get("entityId") as string;
    const docType = formData.get("docType") as string;
    const expiresOn = formData.get("expiresOn") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!entityType || !["driver", "vehicle"].includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type. Must be 'driver' or 'vehicle'" },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "Entity ID is required" },
        { status: 400 }
      );
    }

    if (!docType) {
      return NextResponse.json(
        { error: "Document type is required" },
        { status: 400 }
      );
    }

    // Verify entity belongs to user's fleet
    const entityTable = entityType === "driver" ? "drivers" : "vehicles";
    const { data: entity, error: entityError } = await supabase
      .from(entityTable)
      .select("id")
      .eq("id", entityId)
      .eq("fleet_id", fleet.id)
      .single();

    if (entityError || !entity) {
      return NextResponse.json(
        { error: `${entityType} not found or access denied` },
        { status: 404 }
      );
    }

    // Validate file type (PDF or image)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only PDF and image files are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Generate unique file name
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}_${sanitizedName}`;

    // Upload file to storage
    let filePath: string;
    try {
      filePath = await uploadFile(
        file,
        user.id,
        fleet.id,
        entityType as "driver" | "vehicle",
        entityId,
        fileName
      );
    } catch (uploadError: any) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Calculate initial status
    let status: "green" | "yellow" | "red" = "green";
    if (expiresOn) {
      const expirationDate = new Date(expiresOn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration < 0) {
        status = "red"; // Expired
      } else if (daysUntilExpiration <= 30) {
        status = "yellow"; // Expiring soon
      }
    }

    // Save document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        fleet_id: fleet.id,
        entity_type: entityType,
        entity_id: entityId,
        doc_type: docType,
        file_path: filePath,
        expires_on: expiresOn || null,
        status: status,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docError) {
      // If document creation fails, try to clean up uploaded file
      try {
        const { deleteFile } = await import("@/lib/storage");
        await deleteFile(filePath);
      } catch (cleanupError) {
        // Log but don't fail - file will be orphaned
        console.error("Failed to cleanup file after document creation error:", cleanupError);
      }

      return NextResponse.json(
        { error: `Failed to save document: ${docError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
