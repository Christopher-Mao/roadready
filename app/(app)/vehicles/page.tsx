import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";

export default async function VehiclesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's fleet
  const { data: fleet } = await supabase
    .from("fleets")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!fleet) {
    redirect("/dashboard");
  }

  // Get vehicles
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("fleet_id", fleet.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching vehicles:", error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Vehicles
            </h1>
            <Link
              href="/vehicles/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Add Vehicle
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {!vehicles || vehicles.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">No vehicles yet.</p>
            <Link
              href="/vehicles/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Add Your First Vehicle
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Make/Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.unit_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.vin || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.make && vehicle.model
                        ? `${vehicle.make} ${vehicle.model}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vehicle.year || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={vehicle.status as "green" | "yellow" | "red"} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
