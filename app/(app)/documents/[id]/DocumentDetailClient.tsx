"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import DocumentExtractionDisplay from "@/components/DocumentExtractionDisplay";

interface DocumentDetailClientProps {
  document: any;
  extraction: any;
  entityName: string;
  entityType: "driver" | "vehicle";
  entityId: string;
}

export default function DocumentDetailClient({
  document,
  extraction,
  entityName,
  entityType,
  entityId,
}: DocumentDetailClientProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const handleViewDocument = async () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
      return;
    }

    setLoadingUrl(true);
    try {
      const response = await fetch(`/api/documents/${document.id}`);
      const data = await response.json();
      if (data.signed_url) {
        setSignedUrl(data.signed_url);
        window.open(data.signed_url, "_blank");
      } else {
        alert("Failed to generate download link");
      }
    } catch (err) {
      alert("Failed to load document");
    } finally {
      setLoadingUrl(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No expiration";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/${entityType}s/${entityId}`}
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
              >
                ← Back to {entityType === "driver" ? "Driver" : "Vehicle"}
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {document.doc_type}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {entityName} • Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleViewDocument}
                disabled={loadingUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loadingUrl ? "Loading..." : "View Document"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Document Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Document Information
          </h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Document Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{document.doc_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Expiration Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(document.expiration_date || document.expires_on)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Compliance Status</dt>
              <dd className="mt-1">
                <StatusBadge status={document.status} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Processing Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {document.processing_status === "processing" && (
                  <span className="text-blue-600">Processing...</span>
                )}
                {document.processing_status === "complete" && (
                  <span className="text-green-600">Complete</span>
                )}
                {document.processing_status === "needs_review" && (
                  <span className="text-yellow-600">Needs Review</span>
                )}
                {document.processing_status === "failed" && (
                  <span className="text-red-600">Failed</span>
                )}
                {!document.processing_status && (
                  <span className="text-gray-600">N/A</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Uploaded</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(document.uploaded_at).toLocaleString()}
              </dd>
            </div>
            {document.needs_review && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Review Status</dt>
                <dd className="mt-1">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Needs Review
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Extraction Display (for IRP_CAB_CARD) */}
        {document.doc_type === "IRP_CAB_CARD" && (
          <DocumentExtractionDisplay
            documentId={document.id}
            extraction={extraction}
            processingStatus={document.processing_status || "complete"}
            onUpdate={() => {
              // Refresh page to show updated data
              window.location.reload();
            }}
          />
        )}
      </main>
    </div>
  );
}
