"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

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

interface DashboardClientProps {
  fleetName: string;
  stats: {
    green: number;
    yellow: number;
    red: number;
    total: number;
  };
  driverCount: number;
  vehicleCount: number;
  drivers: Driver[];
  vehicles: Vehicle[];
}

export default function DashboardClient({
  fleetName,
  stats,
  driverCount,
  vehicleCount,
  drivers,
  vehicles,
}: DashboardClientProps) {
  const router = useRouter();
  const [entityFilter, setEntityFilter] = useState<"all" | "drivers" | "vehicles">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "green" | "yellow" | "red">("all");

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (response.ok) {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              RoadReady Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">{fleetName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Status Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Compliance Status
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Green Card */}
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Road Ready
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">
                {stats.green}
              </dd>
              <p className="mt-1 text-xs text-gray-500">
                Drivers & vehicles ready to operate
              </p>
            </div>

            {/* Yellow Card */}
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Expiring Soon
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-yellow-600">
                {stats.yellow}
              </dd>
              <p className="mt-1 text-xs text-gray-500">
                Documents expiring within 30 days
              </p>
            </div>

            {/* Red Card */}
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Not Road Ready
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-red-600">
                {stats.red}
              </dd>
              <p className="mt-1 text-xs text-gray-500">
                Expired or missing documents
              </p>
            </div>
          </div>
        </div>

        {/* Fleet Overview */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drivers
            </h3>
            <p className="text-3xl font-semibold text-gray-900">
              {driverCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total drivers in fleet</p>
            <Link
              href="/drivers"
              className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800"
            >
              Manage drivers →
            </Link>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Vehicles
            </h3>
            <p className="text-3xl font-semibold text-gray-900">
              {vehicleCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Total vehicles in fleet
            </p>
            <Link
              href="/vehicles"
              className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800"
            >
              Manage vehicles →
            </Link>
          </div>
        </div>

        {/* Filtered List View */}
        {(drivers.length > 0 || vehicles.length > 0) && (
          <div className="mb-8 bg-white shadow rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">
                Compliance Overview
              </h3>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {/* Entity Type Filter */}
                <div className="flex gap-1 bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setEntityFilter("all")}
                    className={`px-3 py-1 text-sm rounded ${
                      entityFilter === "all"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setEntityFilter("drivers")}
                    className={`px-3 py-1 text-sm rounded ${
                      entityFilter === "drivers"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Drivers
                  </button>
                  <button
                    onClick={() => setEntityFilter("vehicles")}
                    className={`px-3 py-1 text-sm rounded ${
                      entityFilter === "vehicles"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Vehicles
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex gap-1 bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 text-sm rounded ${
                      statusFilter === "all"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    onClick={() => setStatusFilter("green")}
                    className={`px-3 py-1 text-sm rounded ${
                      statusFilter === "green"
                        ? "bg-white text-green-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Green
                  </button>
                  <button
                    onClick={() => setStatusFilter("yellow")}
                    className={`px-3 py-1 text-sm rounded ${
                      statusFilter === "yellow"
                        ? "bg-white text-yellow-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Yellow
                  </button>
                  <button
                    onClick={() => setStatusFilter("red")}
                    className={`px-3 py-1 text-sm rounded ${
                      statusFilter === "red"
                        ? "bg-white text-red-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Red
                  </button>
                </div>
              </div>
            </div>

            {/* Filtered Results */}
            {(() => {
              // Apply filters
              let filteredDrivers = drivers;
              let filteredVehicles = vehicles;

              // Apply entity filter
              if (entityFilter === "drivers") {
                filteredVehicles = [];
              } else if (entityFilter === "vehicles") {
                filteredDrivers = [];
              }

              // Apply status filter
              if (statusFilter !== "all") {
                filteredDrivers = filteredDrivers.filter(
                  (d) => d.status === statusFilter
                );
                filteredVehicles = filteredVehicles.filter(
                  (v) => v.status === statusFilter
                );
              }

              const totalFiltered = filteredDrivers.length + filteredVehicles.length;

              if (totalFiltered === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items match the selected filters.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
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
                      {filteredDrivers.map((driver) => (
                        <tr key={`driver-${driver.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Driver
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {driver.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={driver.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/drivers/${driver.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                      {filteredVehicles.map((vehicle) => (
                        <tr key={`vehicle-${vehicle.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Vehicle
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {vehicle.unit_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={vehicle.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/vehicles/${vehicle.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/drivers/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-center"
            >
              Add Driver
            </Link>
            <Link
              href="/vehicles/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-center"
            >
              Add Vehicle
            </Link>
            <Link
              href="/documents/upload"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-center"
            >
              Upload Document
            </Link>
            <Link
              href="/exports"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition text-center"
            >
              Export Report
            </Link>
            <Link
              href="/review"
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition text-center"
            >
              Review Queue
            </Link>
            <Link
              href="/audit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-center"
            >
              Audit Trail
            </Link>
          </div>
        </div>

        {/* Info banner - only show if no data */}
        {stats.total === 0 && (
          <div className="mt-8 rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Get Started
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Your fleet is set up! Start by adding drivers and vehicles
                    to track compliance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
