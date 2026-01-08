"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

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
}

export default function DashboardClient({
  fleetName,
  stats,
  driverCount,
  vehicleCount,
}: DashboardClientProps) {
  const router = useRouter();

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
