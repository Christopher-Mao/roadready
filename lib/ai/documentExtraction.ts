/**
 * AI Document Extraction Service
 * 
 * Uses OpenAI to extract document type and expiration date from uploaded documents.
 * Returns suggestions with confidence scores. Low-confidence extractions are flagged for review.
 */

interface ExtractionResult {
  docType: string | null;
  expiresOn: string | null; // ISO date string
  confidence: number; // 0-1
  needsReview: boolean;
  rawText?: string;
  reasoning?: string;
}

/**
 * Extract document information from file using OpenAI Vision API
 */
export async function extractDocumentInfo(
  file: File | Buffer,
  fileName: string
): Promise<ExtractionResult> {
  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    return {
      docType: null,
      expiresOn: null,
      confidence: 0,
      needsReview: true,
      reasoning: "AI extraction not configured (OPENAI_API_KEY missing)",
    };
  }

  try {
    console.log("Starting AI extraction for:", fileName);
    
    // Convert file to base64 for OpenAI Vision API
    const base64Image = await fileToBase64(file);
    console.log("File converted to base64, length:", base64Image.length);

    const mimeType = getMimeType(file);
    console.log("MIME type:", mimeType);

    // Note: PDFs need special handling - OpenAI Vision API supports PDFs but may need different format
    // For now, we'll try with data URL format
    
    // Call OpenAI Vision API
    console.log("Calling OpenAI API...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // or "gpt-4-turbo" for better vision
        messages: [
          {
            role: "system",
            content: `You are a document analysis expert specializing in trucking compliance documents. 
            Analyze the uploaded document and extract:
            1. Document type (e.g., "CDL", "Medical Card", "Insurance", "Registration", "IFTA", "Annual Inspection", etc.)
            2. Expiration date (if present)
            
            Return a JSON object with:
            - docType: the document type (string or null)
            - expiresOn: expiration date in YYYY-MM-DD format (string or null)
            - confidence: your confidence level 0-1 (number)
            - reasoning: brief explanation of your analysis (string)
            
            Common document types for trucking:
            - CDL (Commercial Driver's License)
            - Medical Card (DOT Medical Examiner's Certificate)
            - Insurance (Vehicle Insurance)
            - Registration (Vehicle Registration)
            - IFTA (International Fuel Tax Agreement)
            - Annual Inspection (Vehicle Annual Inspection)
            - Permit (Various permits)
            - Other (if none of the above)
            
            If you cannot clearly identify the document type or expiration date, set confidence < 0.85.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this document (filename: ${fileName}) and extract the document type and expiration date. Return only valid JSON.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${getMimeType(file)};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, response.statusText, errorText);
      
      // Parse error if it's JSON
      let errorMessage = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      
      return {
        docType: null,
        expiresOn: null,
        confidence: 0,
        needsReview: true,
        reasoning: `AI extraction failed: ${errorMessage}`,
      };
    }

    const data = await response.json();
    console.log("OpenAI API response received");
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return {
        docType: null,
        expiresOn: null,
        confidence: 0,
        needsReview: true,
        reasoning: "No response from AI",
      };
    }

    // Parse JSON response
    let extracted: {
      docType?: string | null;
      expiresOn?: string | null;
      confidence?: number;
      reasoning?: string;
    };

    try {
      extracted = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return {
        docType: null,
        expiresOn: null,
        confidence: 0,
        needsReview: true,
        reasoning: "Failed to parse AI response",
      };
    }

    const docType = extracted.docType || null;
    const expiresOn = extracted.expiresOn || null;
    const confidence = extracted.confidence ?? 0.5;
    const reasoning = extracted.reasoning || "";

    // Validate expiration date format
    let validExpiresOn: string | null = null;
    if (expiresOn) {
      try {
        const date = new Date(expiresOn);
        if (!isNaN(date.getTime())) {
          validExpiresOn = date.toISOString().split("T")[0]; // YYYY-MM-DD
        }
      } catch (dateError) {
        console.error("Invalid date format:", expiresOn);
      }
    }

    // Determine if review is needed
    // Low confidence threshold: < 0.85 for doc type, < 0.90 for expiration
    const needsReview =
      confidence < 0.85 ||
      (expiresOn && confidence < 0.90) ||
      !docType;

    return {
      docType,
      expiresOn: validExpiresOn,
      confidence,
      needsReview,
      reasoning,
    };
  } catch (error: any) {
    console.error("Document extraction error:", error);
    return {
      docType: null,
      expiresOn: null,
      confidence: 0,
      needsReview: true,
      reasoning: `Extraction error: ${error.message}`,
    };
  }
}

/**
 * Convert file to base64 string
 */
async function fileToBase64(file: File | Buffer): Promise<string> {
  if (Buffer.isBuffer(file)) {
    return file.toString("base64");
  }

  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  }

  // Fallback for other types
  const arrayBuffer = await (file as any).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

/**
 * Get MIME type from file
 */
function getMimeType(file: File | Buffer): string {
  if (Buffer.isBuffer(file)) {
    return "image/jpeg"; // Default, should be passed explicitly if needed
  }

  if (file instanceof File) {
    return file.type || "image/jpeg";
  }

  // Fallback
  return (file as any).type || "image/jpeg";
}

/**
 * Alternative: Extract from text using GPT (if OCR is done separately)
 * This is a fallback if Vision API is not available
 */
export async function extractFromText(
  text: string,
  fileName: string
): Promise<ExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      docType: null,
      expiresOn: null,
      confidence: 0,
      needsReview: true,
      reasoning: "AI extraction not configured",
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cheaper model for text analysis
        messages: [
          {
            role: "system",
            content: `You are a document analysis expert. Extract document type and expiration date from the provided text.
            Return JSON with: docType, expiresOn (YYYY-MM-DD), confidence (0-1), reasoning.`,
          },
          {
            role: "user",
            content: `Analyze this document text (filename: ${fileName}):\n\n${text}\n\nExtract document type and expiration date.`,
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return {
        docType: null,
        expiresOn: null,
        confidence: 0,
        needsReview: true,
        reasoning: "AI extraction failed",
      };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const extracted = JSON.parse(content);

    const confidence = extracted.confidence ?? 0.5;
    const needsReview = confidence < 0.85 || !extracted.docType;

    let validExpiresOn: string | null = null;
    if (extracted.expiresOn) {
      try {
        const date = new Date(extracted.expiresOn);
        if (!isNaN(date.getTime())) {
          validExpiresOn = date.toISOString().split("T")[0];
        }
      } catch (e) {
        // Invalid date
      }
    }

    return {
      docType: extracted.docType || null,
      expiresOn: validExpiresOn,
      confidence,
      needsReview,
      reasoning: extracted.reasoning || "",
      rawText: text,
    };
  } catch (error: any) {
    return {
      docType: null,
      expiresOn: null,
      confidence: 0,
      needsReview: true,
      reasoning: error.message,
      rawText: text,
    };
  }
}
