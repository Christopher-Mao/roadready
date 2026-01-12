import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { updateEntityStatus } from "@/lib/statusEngine";
import { extractDocumentInfo } from "@/lib/ai/documentExtraction";

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
    const useAI = formData.get("useAI") === "true"; // Optional: enable AI extraction

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

    // AI extraction (optional - if enabled and docType not provided)
    // Note: If user provides docType manually, we respect that and don't override with AI
    let aiExtraction: {
      docType: string | null;
      expiresOn: string | null;
      confidence: number;
      needsReview: boolean;
      reasoning?: string;
    } | null = null;

    let finalDocType = docType;
    let finalExpiresOn = expiresOn;
    let needsReview = false;

    // If AI is enabled and docType is not provided, try AI extraction
    // If user manually entered docType, we still allow AI to suggest expiration date
    if (useAI) {
      try {
        aiExtraction = await extractDocumentInfo(file, file.name);
        
        // Only use AI docType if user didn't provide one
        if (!docType && aiExtraction.docType) {
          finalDocType = aiExtraction.docType;
        }
        
        // Use AI expiration date if user didn't provide one, or if AI found one and user didn't
        if (!expiresOn && aiExtraction.expiresOn) {
          finalExpiresOn = aiExtraction.expiresOn;
        }
        
        // Set needs_review if AI confidence is low
        if (aiExtraction.needsReview) {
          needsReview = true;
        }
      } catch (aiError: any) {
        console.error("AI extraction error:", aiError);
        // Continue with manual entry if AI fails
      }
    }

    // If docType is still missing, require it
    if (!finalDocType) {
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
    // IMPORTANT: If needs_review is true, don't auto-set to red (trust rule)
    let status: "green" | "yellow" | "red" = "green";
    if (finalExpiresOn) {
      const expirationDate = new Date(finalExpiresOn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiration < 0) {
        // Only set to red if we're confident (not needs_review)
        status = needsReview ? "yellow" : "red"; // Expired
      } else if (daysUntilExpiration <= 30) {
        status = "yellow"; // Expiring soon
      }
    }

    // Determine processing status
    // If IRP_CAB_CARD, set to processing (will be processed async)
    const processingStatus = finalDocType === "IRP_CAB_CARD" ? "processing" : "complete";

    // Save document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        fleet_id: fleet.id,
        entity_type: entityType,
        entity_id: entityId,
        doc_type: finalDocType,
        file_path: filePath,
        expires_on: finalExpiresOn || null,
        expiration_date: finalExpiresOn || null,
        status: status,
        processing_status: processingStatus,
        needs_review: needsReview,
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

    // If IRP_CAB_CARD, trigger processing
    if (finalDocType === "IRP_CAB_CARD" && document) {
      // Process asynchronously (don't wait)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/documents/process/${document.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }).catch((err) => {
        console.error("Failed to trigger document processing:", err);
        // Don't fail the upload if processing trigger fails
      });
    } else {
      // Recalculate entity status for non-IRP documents
      try {
        await updateEntityStatus(
          entityType as "driver" | "vehicle",
          entityId,
          fleet.id
        );
      } catch (statusError) {
        // Log but don't fail - document was uploaded successfully
        console.error("Failed to recalculate entity status:", statusError);
      }
    }

    return NextResponse.json(
      {
        document,
        aiExtraction: aiExtraction
          ? {
              confidence: aiExtraction.confidence,
              needsReview: aiExtraction.needsReview,
              reasoning: aiExtraction.reasoning,
            }
          : null,
        processing: finalDocType === "IRP_CAB_CARD" ? "queued" : null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
