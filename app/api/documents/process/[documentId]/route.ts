import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/storage";
import { extractTextFromDocument } from "@/lib/ocr/simpleOCR";
import { parseIRPCabCard } from "@/lib/parsers/irpCabCard";

/**
 * POST /api/documents/process/[documentId]
 * 
 * Process a document: download, run OCR, parse, and save extraction.
 * This is called automatically after upload for IRP_CAB_CARD documents.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    const { data: fleet } = await supabase
      .from("fleets")
      .select("id")
      .eq("id", document.fleet_id)
      .eq("owner_id", user.id)
      .single();

    if (!fleet) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Only process IRP_CAB_CARD documents
    if (document.doc_type !== "IRP_CAB_CARD") {
      return NextResponse.json(
        { error: "This endpoint only processes IRP_CAB_CARD documents" },
        { status: 400 }
      );
    }

    // Update status to processing
    await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", params.documentId);

    try {
      // Download file from Supabase Storage using admin client
      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from("uploads")
        .download(document.file_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message || "Unknown error"}`);
      }

      // Convert blob to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      
      // Determine MIME type from file path
      const mimeType = document.file_path.endsWith(".pdf")
        ? "application/pdf"
        : document.file_path.match(/\.(jpg|jpeg)$/i)
        ? "image/jpeg"
        : document.file_path.match(/\.png$/i)
        ? "image/png"
        : "application/pdf"; // Default

      // Extract text using OCR
      console.log("Extracting text from document...");
      const ocrResult = await extractTextFromDocument(
        fileBuffer,
        mimeType,
        document.file_path
      );

      console.log("OCR completed, text length:", ocrResult.text.length);

      // Parse IRP Cab Card
      console.log("Parsing IRP Cab Card...");
      const parseResult = parseIRPCabCard(ocrResult.text);

      console.log("Parse result:", {
        fieldsExtracted: Object.keys(parseResult.fields).filter(
          (k) => parseResult.fields[k as keyof typeof parseResult.fields] !== null
        ).length,
        errors: parseResult.errors.length,
      });

      // Determine if parsing was successful
      const criticalFields = ["expiration_date", "vin", "plate_number"];
      const hasCriticalFields = criticalFields.some(
        (field) => parseResult.fields[field as keyof typeof parseResult.fields] !== null
      );

      const processingStatus = hasCriticalFields && parseResult.errors.length < 5
        ? "complete"
        : "needs_review";

      // Save extraction to database
      const { data: existingExtraction } = await supabase
        .from("document_extractions")
        .select("id")
        .eq("document_id", params.documentId)
        .single();

      const extractionData = {
        document_id: params.documentId,
        doc_type: "IRP_CAB_CARD",
        extracted_json: parseResult.fields,
        raw_text: parseResult.rawText,
        confidence: parseResult.confidence,
      };

      if (existingExtraction) {
        // Update existing extraction
        await supabase
          .from("document_extractions")
          .update(extractionData)
          .eq("id", existingExtraction.id);
      } else {
        // Create new extraction
        await supabase
          .from("document_extractions")
          .insert(extractionData);
      }

      // Update document with expiration date and status
      const updates: any = {
        processing_status: processingStatus,
        expiration_date: parseResult.fields.expiration_date || null,
      };

      // Also update expires_on for backward compatibility
      if (parseResult.fields.expiration_date) {
        updates.expires_on = parseResult.fields.expiration_date;
      }

      // Update needs_review based on processing status
      if (processingStatus === "needs_review") {
        updates.needs_review = true;
      }

      await supabase
        .from("documents")
        .update(updates)
        .eq("id", params.documentId);

      // Recalculate entity status
      try {
        const { updateEntityStatus } = await import("@/lib/statusEngine");
        await updateEntityStatus(
          document.entity_type as "driver" | "vehicle",
          document.entity_id,
          document.fleet_id
        );
      } catch (statusError) {
        console.error("Failed to recalculate entity status:", statusError);
      }

      return NextResponse.json({
        success: true,
        processing_status: processingStatus,
        fields_extracted: Object.keys(parseResult.fields).filter(
          (k) => parseResult.fields[k as keyof typeof parseResult.fields] !== null
        ).length,
        errors: parseResult.errors,
      });
    } catch (processingError: any) {
      console.error("Document processing error:", processingError);

      // Update status to failed
      await supabase
        .from("documents")
        .update({
          processing_status: "failed",
          needs_review: true,
        })
        .eq("id", params.documentId);

      return NextResponse.json(
        {
          error: "Processing failed",
          details: processingError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Process document error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
