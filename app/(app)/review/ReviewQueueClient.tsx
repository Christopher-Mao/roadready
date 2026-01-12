"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

interface Document {
  id: string;
  entity_type: "driver" | "vehicle";
  entity_id: string;
  doc_type: string;
  expires_on: string | null;
  status: "green" | "yellow" | "red";
  file_path: string;
  uploaded_at: string;
}

interface ReviewQueueClientProps {
  documents: Document[];
  entityMap: Record<string, { name: string; type: "driver" | "vehicle" }>;
}

export default function ReviewQueueClient({
  documents,
  entityMap,
}: ReviewQueueClientProps) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [docType, setDocType] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const handleReview = (doc: Document) => {
    setReviewingId(doc.id);
    setDocType(doc.doc_type);
    setExpiresOn(doc.expires_on || "");
    setError("");
  };

  const handleViewDocument = async (doc: Document) => {
    if (signedUrls[doc.id]) {
      window.open(signedUrls[doc.id], "_blank");
      return;
    }

    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      const data = await response.json();
      if (data.signed_url) {
        setSignedUrls((prev) => ({ ...prev, [doc.id]: data.signed_url }));
        window.open(data.signed_url, "_blank");
      } else {
        setError("Failed to generate document URL");
      }
    } catch (err) {
      setError("Failed to load document");
    }
  };

  const handleConfirm = async (docId: string) => {
    if (!docType.trim()) {
      setError("Document type is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docType: docType.trim(),
          expiresOn: expiresOn || null,
          needsReview: false, // Mark as reviewed
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm document");
      }

      // Mark as reviewed and close
      setReviewedIds((prev) => new Set(prev).add(docId));
      setReviewingId(null);
      setDocType("");
      setExpiresOn("");

      // Refresh page to update list
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to confirm document");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setReviewingId(null);
    setDocType("");
    setExpiresOn("");
    setError("");
  };

  const remainingDocs = documents.filter((d) => !reviewedIds.has(d.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Review Queue
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {remainingDocs.length} document{remainingDocs.length !== 1 ? "s" : ""} need{remainingDocs.length === 1 ? "s" : ""} review
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {remainingDocs.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              All Clear!
            </h2>
            <p className="text-gray-500 mb-6">
              No documents need review at this time.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {remainingDocs.map((doc) => {
              const entityKey = `${doc.entity_type}:${doc.entity_id}`;
              const entity = entityMap[entityKey];

              return (
                <div
                  key={doc.id}
                  className="bg-white shadow rounded-lg p-6 border-l-4 border-yellow-500"
                >
                  {reviewingId === doc.id ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Review Document
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Document Type <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          placeholder="e.g., CDL, Medical Card, Insurance"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiration Date (optional)
                        </label>
                        <input
                          type="date"
                          value={expiresOn}
                          onChange={(e) => setExpiresOn(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={loading}
                        />
                      </div>

                      {error && (
                        <div className="rounded-md bg-red-50 p-4">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleConfirm(doc.id)}
                          disabled={loading || !docType.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {loading ? "Confirming..." : "Confirm & Mark Reviewed"}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={loading}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {entity?.name || "Unknown"}
                          </h3>
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                            {entity?.type === "driver" ? "Driver" : "Vehicle"}
                          </span>
                          <StatusBadge status={doc.status} />
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium">Document Type:</span>{" "}
                            {doc.doc_type || "Not specified"}
                          </p>
                          {doc.expires_on && (
                            <p>
                              <span className="font-medium">Expires:</span>{" "}
                              {new Date(doc.expires_on).toLocaleDateString()}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Uploaded:</span>{" "}
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                        >
                          View Document
                        </button>
                        <button
                          onClick={() => handleReview(doc)}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
