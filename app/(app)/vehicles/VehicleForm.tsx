"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Vehicle {
  id: string;
  unit_number: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  status: "green" | "yellow" | "red";
}

interface VehicleFormProps {
  fleetId: string;
  vehicle?: Vehicle;
}

export default function VehicleForm({ fleetId, vehicle }: VehicleFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    unit_number: vehicle?.unit_number || "",
    vin: vehicle?.vin || "",
    make: vehicle?.make || "",
    model: vehicle?.model || "",
    year: vehicle?.year?.toString() || "",
    status: vehicle?.status || ("green" as "green" | "yellow" | "red"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = vehicle ? `/api/vehicles/${vehicle.id}` : "/api/vehicles";
      const method = vehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      body: JSON.stringify({
        unit_number: formData.unit_number,
        vin: formData.vin,
        make: formData.make,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        fleet_id: fleetId,
      }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save vehicle");
      }

      router.push("/vehicles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="unit_number"
            className="block text-sm font-medium text-gray-700"
          >
            Unit Number *
          </label>
          <input
            type="text"
            id="unit_number"
            required
            value={formData.unit_number}
            onChange={(e) =>
              setFormData({ ...formData, unit_number: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label
            htmlFor="vin"
            className="block text-sm font-medium text-gray-700"
          >
            VIN
          </label>
          <input
            type="text"
            id="vin"
            value={formData.vin}
            onChange={(e) =>
              setFormData({ ...formData, vin: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="make"
              className="block text-sm font-medium text-gray-700"
            >
              Make
            </label>
            <input
              type="text"
              id="make"
              value={formData.make}
              onChange={(e) =>
                setFormData({ ...formData, make: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>

          <div>
            <label
              htmlFor="model"
              className="block text-sm font-medium text-gray-700"
            >
              Model
            </label>
            <input
              type="text"
              id="model"
              value={formData.model}
              onChange={(e) =>
                setFormData({ ...formData, model: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="year"
            className="block text-sm font-medium text-gray-700"
          >
            Year
          </label>
          <input
            type="number"
            id="year"
            min="1900"
            max={new Date().getFullYear() + 1}
            value={formData.year}
            onChange={(e) =>
              setFormData({ ...formData, year: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700"
          >
            Status (Auto-calculated)
          </label>
          <select
            id="status"
            value={formData.status}
            disabled
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed sm:text-sm px-3 py-2 border"
          >
            <option value="green">Road Ready</option>
            <option value="yellow">Expiring Soon</option>
            <option value="red">Not Road Ready</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Status is automatically calculated based on required documents and expiration dates.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Link
            href="/vehicles"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : vehicle ? "Update Vehicle" : "Create Vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
}
