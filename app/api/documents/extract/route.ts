import { NextRequest, NextResponse } from "next/server";
import { extractDocumentInfo } from "@/lib/ai/documentExtraction";

/**
 * POST /api/documents/extract
 * 
 * Extract document information using AI without uploading.
 * This is called when user selects a file to get AI suggestions.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and image files are allowed." },
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

    // Extract document information
    console.log("Extracting document info for file:", file.name, "Type:", file.type, "Size:", file.size);
    const extraction = await extractDocumentInfo(file, file.name);
    console.log("Extraction result:", extraction);

    return NextResponse.json({ extraction });
  } catch (error: any) {
    console.error("Document extraction error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        extraction: {
          docType: null,
          expiresOn: null,
          confidence: 0,
          needsReview: true,
          reasoning: `Error: ${error.message || "Unknown error"}`,
        }
      },
      { status: 500 }
    );
  }
}
