/**
 * Simple OCR Integration
 * 
 * For MVP, we'll use a simpler approach:
 * 1. Try Google Document AI if configured
 * 2. Fallback to basic text extraction from PDFs
 * 3. For images, we can use Tesseract.js (client-side) or a service
 * 
 * This is a simplified version that works without complex setup.
 */

/**
 * Process document with OCR
 * For now, we'll use a service-based approach that can be extended
 */
export async function extractTextFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ text: string; confidence: number }> {
  // Check if Google Document AI is configured
  if (process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID) {
    try {
      const { processDocumentWithGoogleAI } = await import("./googleDocumentAI");
      const result = await processDocumentWithGoogleAI(fileBuffer, mimeType);
      return {
        text: result.text,
        confidence: result.confidence,
      };
    } catch (error: any) {
      console.error("Google Document AI failed, falling back:", error.message);
      // Fall through to fallback
    }
  }

  // Fallback: For PDFs, try to extract text using a simple approach
  // For MVP, we can use pdf-parse or similar
  if (mimeType === "application/pdf") {
    try {
      // Try to use pdf-parse if available
      // Note: pdf-parse needs to be installed: npm install pdf-parse
      let pdfParse;
      try {
        pdfParse = require("pdf-parse");
      } catch (requireError) {
        // If pdf-parse is not installed, throw a helpful error
        throw new Error(
          "PDF parsing requires pdf-parse package. Install with: npm install pdf-parse. " +
          "Alternatively, configure Google Document AI for better OCR."
        );
      }
      const data = await pdfParse(fileBuffer);
      return {
        text: data.text,
        confidence: 0.7, // Lower confidence for basic extraction
      };
    } catch (error: any) {
      console.error("PDF text extraction failed:", error);
      throw new Error(
        error.message || "Failed to extract text from PDF. Please ensure the document is readable."
      );
    }
  }

  // For images, we need OCR - for MVP, suggest using Google Document AI
  if (mimeType.startsWith("image/")) {
    throw new Error(
      "Image OCR requires Google Document AI. Please configure GOOGLE_DOCUMENT_AI_PROJECT_ID or use PDF format."
    );
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
