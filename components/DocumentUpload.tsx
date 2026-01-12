"use client";

import { useState } from "react";

interface DocumentUploadProps {
  entityType: "driver" | "vehicle";
  entityId: string;
  onUploadComplete?: () => void;
}

export default function DocumentUpload({
  entityType,
  entityId,
  onUploadComplete,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [useAI, setUseAI] = useState(true); // AI enabled by default
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    docType: string;
    expiresOn: string;
    confidence: number;
    reasoning?: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Only PDF and image files are allowed");
        setFile(null);
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError("");
      setAiSuggestion(null);

      // Auto-extract with AI if enabled
      if (useAI) {
        await extractWithAI(selectedFile);
      }
    }
  };

  const extractWithAI = async (file: File) => {
    setAiExtracting(true);
    setError("");
    setAiSuggestion(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("Starting AI extraction for file:", file.name);

      const response = await fetch("/api/documents/extract", {
        method: "POST",
        body: formData,
      });

      console.log("AI extraction response status:", response.status);

      const data = await response.json();
      console.log("AI extraction response data:", data);

      if (response.ok && data.extraction) {
        const extraction = data.extraction;
        console.log("Extraction result:", extraction);

        // Check if OpenAI is configured
        if (extraction.reasoning?.includes("not configured") || extraction.reasoning?.includes("OPENAI_API_KEY missing")) {
          setError("AI extraction is not configured. Please add OPENAI_API_KEY to your environment variables, or disable AI extraction and enter manually.");
          return;
        }

        if (extraction.docType && extraction.confidence > 0.5) {
          setAiSuggestion({
            docType: extraction.docType,
            expiresOn: extraction.expiresOn || "",
            confidence: extraction.confidence,
            reasoning: extraction.reasoning,
          });

          // Auto-fill if confidence is high
          if (extraction.confidence >= 0.85) {
            setDocType(extraction.docType);
            if (extraction.expiresOn) {
              setExpiresOn(extraction.expiresOn);
            }
          }
        } else if (!extraction.docType) {
          // AI couldn't extract, but that's okay - user can enter manually
          console.log("AI extraction returned no document type");
          // Don't show error - just let user enter manually
        }
      } else {
        // If AI extraction fails, show helpful error
        const errorMsg = data.error || "AI extraction failed";
        console.error("AI extraction error:", errorMsg);
        
        // Only show error if it's a configuration issue, otherwise silently fail
        if (errorMsg.includes("not configured") || errorMsg.includes("OPENAI_API_KEY")) {
          setError("AI extraction is not configured. Please add OPENAI_API_KEY to your environment variables, or disable AI extraction and enter manually.");
        } else {
          // For other errors, just log and continue (user can enter manually)
          console.log("AI extraction failed, continuing with manual entry:", errorMsg);
        }
      }
    } catch (err: any) {
      // AI extraction failed, show error
      console.error("AI extraction error:", err);
      setError(`AI extraction failed: ${err.message || "Unknown error"}. You can continue with manual entry.`);
    } finally {
      setAiExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docType) {
      setError("Please select a file and enter document type");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);
      formData.append("docType", docType);
      if (expiresOn) {
        formData.append("expiresOn", expiresOn);
      }
      formData.append("useAI", useAI ? "true" : "false");

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Reset form
      setFile(null);
      setDocType("");
      setExpiresOn("");
      setAiSuggestion(null);
      setSuccess(true);

      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }

      // Callback to refresh document list
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Upload Document
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* AI Extraction Toggle */}
        <div className="flex items-center">
          <input
            id="use-ai"
            type="checkbox"
            checked={useAI}
            onChange={(e) => {
              setUseAI(e.target.checked);
              if (!e.target.checked) {
                setAiSuggestion(null);
              } else if (file) {
                extractWithAI(file);
              }
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={uploading || aiExtracting}
          />
          <label htmlFor="use-ai" className="ml-2 block text-sm text-gray-700">
            Use AI to extract document type and expiration date
          </label>
        </div>

        {/* File Input */}
        <div>
          <label
            htmlFor="file-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            File (PDF or Image)
          </label>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={uploading || aiExtracting}
          />
          {file && (
            <p className="mt-1 text-sm text-gray-500">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {aiExtracting && (
            <p className="mt-1 text-sm text-blue-600">
              🤖 Analyzing document with AI...
            </p>
          )}
        </div>

        {/* AI Suggestion */}
        {aiSuggestion && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  AI Suggestion
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    <span className="font-medium">Document Type:</span>{" "}
                    {aiSuggestion.docType}
                  </p>
                  {aiSuggestion.expiresOn && (
                    <p>
                      <span className="font-medium">Expiration Date:</span>{" "}
                      {new Date(aiSuggestion.expiresOn).toLocaleDateString()}
                    </p>
                  )}
                  <p className="mt-1">
                    <span className="font-medium">Confidence:</span>{" "}
                    {(aiSuggestion.confidence * 100).toFixed(0)}%
                  </p>
                  {aiSuggestion.reasoning && (
                    <p className="mt-1 text-xs text-blue-600">
                      {aiSuggestion.reasoning}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDocType(aiSuggestion.docType);
                      if (aiSuggestion.expiresOn) {
                        setExpiresOn(aiSuggestion.expiresOn);
                      }
                      setAiSuggestion(null);
                    }}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Use Suggestion
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuggestion(null)}
                    className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Dismiss
                  </button>
                </div>
                {aiSuggestion.confidence < 0.85 && (
                  <p className="mt-2 text-xs text-yellow-700 font-medium">
                    ⚠️ Low confidence - This document will be flagged for review
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Type */}
        <div>
          <label
            htmlFor="doc-type"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Document Type <span className="text-red-500">*</span>
          </label>
          <select
            id="doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={uploading}
            required
          >
            <option value="">Select document type...</option>
            <option value="CDL">CDL</option>
            <option value="Medical Card">Medical Card</option>
            <option value="Insurance">Insurance</option>
            <option value="Registration">Registration</option>
            <option value="IRP_CAB_CARD">IRP Cab Card</option>
            <option value="IFTA">IFTA</option>
            <option value="Annual Inspection">Annual Inspection</option>
            <option value="Permit">Permit</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Expiration Date */}
        <div>
          <label
            htmlFor="expires-on"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Expiration Date (optional)
          </label>
          <input
            id="expires-on"
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={uploading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">AI Extraction Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  <p className="mt-2 text-xs">
                    You can continue by entering the document type and expiration date manually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Document uploaded successfully!
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading || !file || !docType}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </form>
    </div>
  );
}
