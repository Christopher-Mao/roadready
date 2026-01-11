"use client";

import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";

interface Document {
  id: string;
  doc_type: string;
  expires_on: string | null;
  status: "green" | "yellow" | "red";
  uploaded_at: string;
  file_path: string;
}

interface DocumentsListProps {
  entityType: "driver" | "vehicle";
  entityId: string;
}

export default function DocumentsList({
  entityType,
  entityId,
}: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDocType, setEditDocType] = useState("");
  const [editExpiresOn, setEditExpiresOn] = useState("");

  const fetchDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/documents?entityType=${entityType}&entityId=${entityId}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch documents");
      }

      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId]);

  const handleView = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get document");
      }

      if (data.signed_url) {
        window.open(data.signed_url, "_blank");
      } else {
        alert("Failed to generate download link");
      }
    } catch (err: any) {
      alert(err.message || "Failed to view document");
    }
  };

  const handleEdit = (doc: Document) => {
    setEditingId(doc.id);
    setEditDocType(doc.doc_type);
    setEditExpiresOn(doc.expires_on || "");
  };

  const handleSaveEdit = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docType: editDocType,
          expiresOn: editExpiresOn || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update document");
      }

      setEditingId(null);
      fetchDocuments(); // Refresh list
    } catch (err: any) {
      alert(err.message || "Failed to update document");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDocType("");
    setEditExpiresOn("");
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete document");
      }

      fetchDocuments(); // Refresh list
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No expiration";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiresOn: string | null) => {
    if (!expiresOn) return false;
    const expirationDate = new Date(expiresOn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expirationDate < today;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <span className="text-sm text-gray-500">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {documents.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No documents uploaded yet. Upload your first document above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === doc.id ? (
                      <input
                        type="text"
                        value={editDocType}
                        onChange={(e) => setEditDocType(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">
                        {doc.doc_type}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === doc.id ? (
                      <input
                        type="date"
                        value={editExpiresOn}
                        onChange={(e) => setEditExpiresOn(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <div
                        className={`text-sm ${
                          isExpired(doc.expires_on)
                            ? "text-red-600 font-semibold"
                            : "text-gray-500"
                        }`}
                      >
                        {formatDate(doc.expires_on)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={doc.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === doc.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSaveEdit(doc.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleView(doc.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
