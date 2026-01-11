"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DocumentUpload from "@/components/DocumentUpload";

export default function UploadDocumentPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; unit_number: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"driver" | "vehicle" | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    // Fetch drivers and vehicles
    const fetchData = async () => {
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          fetch("/api/drivers"),
          fetch("/api/vehicles"),
        ]);

        if (driversRes.ok) {
          const driversData = await driversRes.json();
          setDrivers(driversData.drivers || []);
        }

        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          setVehicles(vehiclesData.vehicles || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUploadComplete = () => {
    // Redirect to the entity detail page after successful upload
    if (selectedType && selectedId) {
      router.push(`/${selectedType}s/${selectedId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

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
                Upload Document
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Driver or Vehicle
          </h2>

          {/* Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedType("driver");
                  setSelectedId("");
                }}
                className={`px-4 py-2 rounded-md ${
                  selectedType === "driver"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Driver Document
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType("vehicle");
                  setSelectedId("");
                }}
                className={`px-4 py-2 rounded-md ${
                  selectedType === "vehicle"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Vehicle Document
              </button>
            </div>
          </div>

          {/* Entity Selection */}
          {selectedType && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select {selectedType === "driver" ? "Driver" : "Vehicle"}
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a {selectedType === "driver" ? "driver" : "vehicle"}...</option>
                {selectedType === "driver"
                  ? drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))
                  : vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.unit_number}
                      </option>
                    ))}
              </select>
            </div>
          )}

          {drivers.length === 0 && vehicles.length === 0 && (
            <div className="rounded-md bg-yellow-50 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                No drivers or vehicles found. Please add a driver or vehicle first.
              </p>
              <div className="mt-4 flex gap-4">
                <Link
                  href="/drivers/new"
                  className="text-sm text-yellow-700 underline hover:text-yellow-900"
                >
                  Add Driver
                </Link>
                <Link
                  href="/vehicles/new"
                  className="text-sm text-yellow-700 underline hover:text-yellow-900"
                >
                  Add Vehicle
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Upload Form */}
        {selectedType && selectedId && (
          <DocumentUpload
            entityType={selectedType}
            entityId={selectedId}
            onUploadComplete={handleUploadComplete}
          />
        )}

        {selectedType && !selectedId && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500 text-center">
              Please select a {selectedType === "driver" ? "driver" : "vehicle"} above to upload a document.
            </p>
          </div>
        )}

        {!selectedType && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500 text-center">
              Please select whether this is a driver or vehicle document above.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
