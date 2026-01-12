"use client";

import { useState } from "react";
import { IRPCabCardFields } from "@/lib/parsers/irpCabCard";

interface DocumentExtractionDisplayProps {
  documentId: string;
  extraction: {
    extracted_json: IRPCabCardFields;
    raw_text?: string;
    confidence?: Record<string, number>;
  } | null;
  processingStatus: string;
  onUpdate?: () => void;
}

export default function DocumentExtractionDisplay({
  documentId,
  extraction,
  processingStatus,
  onUpdate,
}: DocumentExtractionDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<IRPCabCardFields | null>(
    extraction?.extracted_json || null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fields = editedFields || extraction?.extracted_json;

  const handleSave = async () => {
    if (!editedFields) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/documents/${documentId}/extraction`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extracted_json: editedFields,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save extraction");
      }

      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof IRPCabCardFields, value: any) => {
    if (!editedFields) return;
    setEditedFields({
      ...editedFields,
      [field]: value,
    });
  };

  if (processingStatus === "processing") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg
            className="animate-spin h-5 w-5 text-blue-600 mr-3"
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
          <p className="text-sm text-blue-800">
            Processing document... This may take a few moments.
          </p>
        </div>
      </div>
    );
  }

  if (processingStatus === "failed") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          Document processing failed. Please try uploading again or contact support.
        </p>
      </div>
    );
  }

  if (!extraction || !fields) {
    return null;
  }

  const needsReview = processingStatus === "needs_review";
  const confidence = extraction.confidence || {};

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Extracted Fields
        </h3>
        {needsReview && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            {isEditing ? "Cancel" : "Edit Fields"}
          </button>
        )}
      </div>

      {needsReview && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ This document needs review. Please verify and correct the extracted fields below.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expiration Date */}
        <FieldDisplay
          label="Expiration Date"
          value={fields.expiration_date}
          confidence={confidence.expiration_date}
          editing={isEditing}
          onChange={(value) => handleFieldChange("expiration_date", value)}
          type="date"
        />

        {/* Registrant Name */}
        <FieldDisplay
          label="Registrant Name"
          value={fields.registrant_name}
          confidence={confidence.registrant_name}
          editing={isEditing}
          onChange={(value) => handleFieldChange("registrant_name", value)}
        />

        {/* Plate Number */}
        <FieldDisplay
          label="Plate Number"
          value={fields.plate_number}
          confidence={confidence.plate_number}
          editing={isEditing}
          onChange={(value) => handleFieldChange("plate_number", value)}
        />

        {/* VIN */}
        <FieldDisplay
          label="VIN"
          value={fields.vin}
          confidence={confidence.vin}
          editing={isEditing}
          onChange={(value) => handleFieldChange("vin", value)}
        />

        {/* USDOT Number */}
        <FieldDisplay
          label="USDOT Number"
          value={fields.usdot_number}
          confidence={confidence.usdot_number}
          editing={isEditing}
          onChange={(value) => handleFieldChange("usdot_number", value)}
        />

        {/* Vehicle Type */}
        <FieldDisplay
          label="Vehicle Type"
          value={fields.vehicle_type}
          confidence={confidence.vehicle_type}
          editing={isEditing}
          onChange={(value) => handleFieldChange("vehicle_type", value)}
        />

        {/* Unit Number */}
        <FieldDisplay
          label="Unit Number"
          value={fields.unit_number}
          confidence={confidence.unit_number}
          editing={isEditing}
          onChange={(value) => handleFieldChange("unit_number", value)}
        />

        {/* Gross Weight */}
        <FieldDisplay
          label="Gross Weight (lbs)"
          value={fields.gross_weight?.toString()}
          confidence={confidence.gross_weight}
          editing={isEditing}
          onChange={(value) => handleFieldChange("gross_weight", value ? parseInt(value) : null)}
          type="number"
        />

        {/* Axles */}
        <FieldDisplay
          label="Axles"
          value={fields.axles?.toString()}
          confidence={confidence.axles}
          editing={isEditing}
          onChange={(value) => handleFieldChange("axles", value ? parseInt(value) : null)}
          type="number"
        />

        {/* Make */}
        <FieldDisplay
          label="Make"
          value={fields.make}
          confidence={confidence.make}
          editing={isEditing}
          onChange={(value) => handleFieldChange("make", value)}
        />

        {/* Model Year */}
        <FieldDisplay
          label="Model Year"
          value={fields.model_year?.toString()}
          confidence={confidence.model_year}
          editing={isEditing}
          onChange={(value) => handleFieldChange("model_year", value ? parseInt(value) : null)}
          type="number"
        />
      </div>

      {/* Multi-line fields */}
      {fields.registrant_address && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registrant Address
            {confidence.registrant_address !== undefined && (
              <span className="ml-2 text-xs text-gray-500">
                ({(confidence.registrant_address * 100).toFixed(0)}% confidence)
              </span>
            )}
          </label>
          {isEditing ? (
            <textarea
              value={fields.registrant_address}
              onChange={(e) => handleFieldChange("registrant_address", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          ) : (
            <p className="text-sm text-gray-900 whitespace-pre-line">
              {fields.registrant_address}
            </p>
          )}
        </div>
      )}

      {/* Jurisdiction Weights */}
      {fields.jurisdiction_weights && Object.keys(fields.jurisdiction_weights).length > 0 && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jurisdiction Weights
          </label>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    State/Province
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Max Weight
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(fields.jurisdiction_weights).map(([state, data]) => (
                  <tr key={state}>
                    <td className="px-4 py-2 text-sm text-gray-900">{state}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {data.max_weight.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditedFields(extraction?.extracted_json || null);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

interface FieldDisplayProps {
  label: string;
  value: string | number | null;
  confidence?: number;
  editing: boolean;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}

function FieldDisplay({
  label,
  value,
  confidence,
  editing,
  onChange,
  type = "text",
}: FieldDisplayProps) {
  const displayValue = value?.toString() || "—";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {confidence !== undefined && (
          <span className="ml-2 text-xs text-gray-500">
            ({(confidence * 100).toFixed(0)}% confidence)
          </span>
        )}
      </label>
      {editing ? (
        <input
          type={type}
          value={value?.toString() || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <p className="text-sm text-gray-900">{displayValue}</p>
      )}
    </div>
  );
}
