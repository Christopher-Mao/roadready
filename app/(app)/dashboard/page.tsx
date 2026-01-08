"use client";

import Link from "next/link";

export default function DashboardPage() {
  // Placeholder data
  const stats = {
    green: 12,
    yellow: 3,
    red: 2,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            RoadReady Dashboard
          </h1>
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout (placeholder)
          </Link>
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

        {/* Placeholder sections */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <p className="text-gray-500 text-sm">
              No activity yet. Start by adding drivers and vehicles.
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Add Driver
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Add Vehicle
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Upload Document
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition">
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-8 rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Dashboard Placeholder
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This is a placeholder dashboard. Once Supabase is configured,
                  you&apos;ll see real data for your fleet&apos;s compliance status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
