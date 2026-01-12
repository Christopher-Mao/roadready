"use client";

import { useState } from "react";
import Link from "next/link";

interface AuditLog {
  id: string;
  document_id: string | null;
  action: "created" | "updated" | "deleted" | "reviewed";
  changed_by: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

interface AlertLog {
  id: string;
  channel: "email" | "sms";
  to_address: string;
  reason: string;
  entity_type: "driver" | "vehicle" | null;
  entity_id: string | null;
  document_id: string | null;
  status: "queued" | "sent" | "failed";
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

interface AuditTrailClientProps {
  auditLogs: AuditLog[];
  alertLogs: AlertLog[];
  documentsMap: Record<string, { doc_type: string; entity_type: string; entity_id: string }>;
  entityMap: Record<string, { name: string; type: "driver" | "vehicle" }>;
}

export default function AuditTrailClient({
  auditLogs,
  alertLogs,
  documentsMap,
  entityMap,
}: AuditTrailClientProps) {
  const [activeTab, setActiveTab] = useState<"documents" | "alerts">("documents");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800";
      case "updated":
        return "bg-blue-100 text-blue-800";
      case "deleted":
        return "bg-red-100 text-red-800";
      case "reviewed":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "queued":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
                Audit Trail
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Complete history of document changes and alerts
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("documents")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "documents"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Document Changes ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "alerts"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Alert Logs ({alertLogs.length})
            </button>
          </nav>
        </div>

        {/* Document Changes Tab */}
        {activeTab === "documents" && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No document changes recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Changes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => {
                      const doc = log.document_id ? documentsMap[log.document_id] : null;
                      const entityKey = doc
                        ? `${doc.entity_type}:${doc.entity_id}`
                        : null;
                      const entity = entityKey ? entityMap[entityKey] : null;

                      return (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {doc ? (
                              <span>{doc.doc_type || "Unknown"}</span>
                            ) : (
                              <span className="text-gray-400">Document deleted</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {entity ? (
                              <span>
                                {entity.name} ({entity.type})
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {log.action === "updated" && log.old_values && log.new_values ? (
                              <div className="space-y-1">
                                {Object.keys(log.new_values).map((key) => {
                                  const oldVal = log.old_values[key];
                                  const newVal = log.new_values[key];
                                  if (oldVal !== newVal) {
                                    return (
                                      <div key={key} className="text-xs">
                                        <span className="font-medium">{key}:</span>{" "}
                                        <span className="text-red-600 line-through">
                                          {String(oldVal || "—")}
                                        </span>{" "}
                                        →{" "}
                                        <span className="text-green-600">
                                          {String(newVal || "—")}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Alert Logs Tab */}
        {activeTab === "alerts" && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {alertLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No alerts sent yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {alertLogs.map((alert) => {
                      const entityKey = alert.entity_id
                        ? `${alert.entity_type}:${alert.entity_id}`
                        : null;
                      const entity = entityKey ? entityMap[entityKey] : null;

                      return (
                        <tr key={alert.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(alert.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {alert.channel.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {alert.to_address}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div>
                              <div>{alert.reason}</div>
                              {entity && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {entity.name} ({entity.type})
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                alert.status
                              )}`}
                            >
                              {alert.status}
                            </span>
                            {alert.sent_at && (
                              <div className="text-xs text-gray-400 mt-1">
                                Sent: {formatDate(alert.sent_at)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {alert.error ? (
                              <span className="text-red-600 text-xs">{alert.error}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
