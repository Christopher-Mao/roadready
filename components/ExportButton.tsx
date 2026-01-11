"use client";

import { useState } from "react";

interface ExportButtonProps {
  entityType: "driver" | "vehicle";
  entityId: string;
  entityName: string;
}

export default function ExportButton({
  entityType,
  entityId,
  entityName,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/exports/${entityType}/${entityId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Export failed");
      }

      // Download CSV
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entityType}_${entityName.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Create a text file with document download links
      const docLinks = data.documents
        .map(
          (doc: any) =>
            `${doc.doc_type} - ${doc.expires_on ? new Date(doc.expires_on).toLocaleDateString() : "No expiration"}\n` +
            `  Status: ${doc.status.toUpperCase()}\n` +
            `  Uploaded: ${new Date(doc.uploaded_at).toLocaleString()}\n` +
            `  Download: ${doc.download_url || "N/A"}\n`
        )
        .join("\n");

      const docBlob = new Blob(
        [
          `Export Date: ${new Date(data.export_date).toLocaleString()}\n\n` +
          `Summary:\n` +
          `  Total Documents: ${data.summary.total_documents}\n` +
          `  Valid: ${data.summary.valid_documents}\n` +
          `  Expiring Soon: ${data.summary.expiring_soon_documents}\n` +
          `  Expired: ${data.summary.expired_documents}\n\n` +
          `Document Download Links:\n\n${docLinks}`,
        ],
        { type: "text/plain" }
      );
      const docUrl = window.URL.createObjectURL(docBlob);
      const docA = document.createElement("a");
      docA.href = docUrl;
      docA.download = `${entityType}_${entityName.replace(/[^a-z0-9]/gi, "_")}_documents_${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(docA);
      docA.click();
      window.URL.revokeObjectURL(docUrl);
      document.body.removeChild(docA);
    } catch (err: any) {
      setError(err.message || "Failed to export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Compliance Packet
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 rounded-md bg-red-50 p-2">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500">
        Downloads CSV with compliance data and a text file with document download links
      </p>
    </div>
  );
}
