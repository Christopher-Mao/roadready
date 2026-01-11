"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ExportButton from "@/components/ExportButton";

interface Driver {
  id: string;
  name: string;
  status: "green" | "yellow" | "red";
}

interface Vehicle {
  id: string;
  unit_number: string;
  status: "green" | "yellow" | "red";
}

export default function ExportsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversRes, vehiclesRes] = await Promise.all([
          fetch("/api/drivers"),
          fetch("/api/vehicles"),
        ]);

        if (!driversRes.ok || !vehiclesRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const driversData = await driversRes.json();
        const vehiclesData = await vehiclesRes.json();

        setDrivers(driversData.drivers || []);
        setVehicles(vehiclesData.vehicles || []);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-6 max-w-md">
          <p className="text-red-600">{error}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
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
                Export Compliance Reports
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-gray-600">
            Export compliance packets for individual drivers or vehicles. Each export includes
            a CSV file with compliance data and a text file with document download links.
          </p>
        </div>

        {/* Drivers Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Drivers</h2>
          {drivers.length === 0 ? (
            <p className="text-gray-500">No drivers found. Add drivers to export compliance reports.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/drivers/${driver.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-900"
                        >
                          {driver.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            driver.status === "green"
                              ? "bg-green-100 text-green-800"
                              : driver.status === "yellow"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {driver.status === "green"
                            ? "Road Ready"
                            : driver.status === "yellow"
                            ? "Expiring Soon"
                            : "Not Road Ready"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ExportButton
                          entityType="driver"
                          entityId={driver.id}
                          entityName={driver.name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vehicles Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vehicles</h2>
          {vehicles.length === 0 ? (
            <p className="text-gray-500">No vehicles found. Add vehicles to export compliance reports.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-900"
                        >
                          {vehicle.unit_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            vehicle.status === "green"
                              ? "bg-green-100 text-green-800"
                              : vehicle.status === "yellow"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {vehicle.status === "green"
                            ? "Road Ready"
                            : vehicle.status === "yellow"
                            ? "Expiring Soon"
                            : "Not Road Ready"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ExportButton
                          entityType="vehicle"
                          entityId={vehicle.id}
                          entityName={vehicle.unit_number}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
