"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Driver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cdl_number?: string;
  status: "green" | "yellow" | "red";
}

interface DriverFormProps {
  fleetId: string;
  driver?: Driver;
}

export default function DriverForm({ fleetId, driver }: DriverFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: driver?.name || "",
    email: driver?.email || "",
    phone: driver?.phone || "",
    cdl_number: driver?.cdl_number || "",
    status: driver?.status || ("green" as "green" | "yellow" | "red"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = driver
        ? `/api/drivers/${driver.id}`
        : "/api/drivers";
      const method = driver ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cdl_number: formData.cdl_number,
        fleet_id: fleetId,
      }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save driver");
      }

      router.push("/drivers");
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
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label
            htmlFor="cdl_number"
            className="block text-sm font-medium text-gray-700"
          >
            CDL Number
          </label>
          <input
            type="text"
            id="cdl_number"
            value={formData.cdl_number}
            onChange={(e) =>
              setFormData({ ...formData, cdl_number: e.target.value })
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
            href="/drivers"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : driver ? "Update Driver" : "Create Driver"}
          </button>
        </div>
      </form>
    </div>
  );
}
