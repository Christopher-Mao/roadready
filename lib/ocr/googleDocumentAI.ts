/**
 * Google Document AI OCR Integration
 * 
 * Processes documents using Google Document AI API for OCR and layout extraction.
 * Requires GOOGLE_DOCUMENT_AI_PROJECT_ID and GOOGLE_DOCUMENT_AI_LOCATION env vars.
 */

interface OCRResult {
  text: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}

/**
 * Process document using Google Document AI
 * 
 * @param fileBuffer - File buffer (PDF or image)
 * @param mimeType - MIME type of the file
 * @returns OCR result with text and confidence
 */
export async function processDocumentWithGoogleAI(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  const projectId = process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID;
  const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION || "us";
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

  if (!projectId) {
    throw new Error("GOOGLE_DOCUMENT_AI_PROJECT_ID is not configured");
  }

  if (!processorId) {
    throw new Error("GOOGLE_DOCUMENT_AI_PROCESSOR_ID is not configured");
  }

  // Google Document AI requires service account credentials
  // For serverless, we'll use the REST API with service account key
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  if (!credentials) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not configured");
  }

  let authToken: string;
  try {
    // Parse credentials and get access token
    const creds = JSON.parse(credentials);
    authToken = await getAccessToken(creds);
  } catch (error) {
    throw new Error("Failed to parse Google credentials");
  }

  // Base64 encode the file
  const base64Content = fileBuffer.toString("base64");

  // Call Google Document AI API
  const url = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rawDocument: {
        content: base64Content,
        mimeType: mimeType,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Google Document AI error:", error);
    throw new Error(`Google Document AI API error: ${response.statusText}`);
  }

  const result = await response.json();

  // Extract text from document
  const document = result.document;
  const fullText = document.text || "";
  
  // Calculate average confidence
  const pages = document.pages || [];
  const pageTexts = pages.map((page: any, index: number) => ({
    pageNumber: index + 1,
    text: page.paragraphs?.map((p: any) => p.layout?.textAnchor?.textSegments?.map((s: any) => s.text).join("") || "").join("\n") || "",
    confidence: page.confidence || 0.8,
  }));

  const avgConfidence = pages.length > 0
    ? pages.reduce((sum: number, p: any) => sum + (p.confidence || 0.8), 0) / pages.length
    : 0.8;

  // Extract entities if available
  const entities = document.entities?.map((entity: any) => ({
    type: entity.type,
    value: entity.textAnchor?.textSegments?.map((s: any) => s.text).join("") || entity.mentionText || "",
    confidence: entity.confidence || 0.8,
  })) || [];

  return {
    text: fullText,
    confidence: avgConfidence,
    pages: pageTexts,
    entities,
  };
}

/**
 * Get OAuth2 access token from service account credentials
 */
async function getAccessToken(credentials: any): Promise<string> {
  // For MVP, we'll use a simpler approach with JWT
  // In production, consider using google-auth-library npm package
  
  const jwt = require("jsonwebtoken");
  const now = Math.floor(Date.now() / 1000);
  
  const token = jwt.sign(
    {
      iss: credentials.client_email,
      sub: credentials.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/cloud-platform",
    },
    credentials.private_key,
    { algorithm: "RS256" }
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: token,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get access token");
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Alternative: Use AWS Textract (if Google Document AI is not available)
 * This is a fallback option
 */
export async function processDocumentWithTextract(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  // AWS Textract implementation would go here
  // For now, we'll focus on Google Document AI
  throw new Error("AWS Textract not implemented - use Google Document AI");
}
