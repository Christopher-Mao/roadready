"use client";

import { useState } from "react";
import DocumentUpload from "./DocumentUpload";
import DocumentsList from "./DocumentsList";

interface DocumentsSectionProps {
  entityType: "driver" | "vehicle";
  entityId: string;
}

export default function DocumentsSection({
  entityType,
  entityId,
}: DocumentsSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    // Trigger refresh by changing key
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
      <DocumentUpload
        entityType={entityType}
        entityId={entityId}
        onUploadComplete={handleUploadComplete}
      />
      <DocumentsList
        key={refreshKey}
        entityType={entityType}
        entityId={entityId}
      />
    </div>
  );
}
