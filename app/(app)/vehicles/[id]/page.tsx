import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import VehicleForm from "../VehicleForm";
import DocumentsSection from "@/components/DocumentsSection";

export default async function EditVehiclePage({
  params,
}: {
  params: { id: string };
}) {
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

  // Get vehicle
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", params.id)
    .eq("fleet_id", fleet.id)
    .single();

  if (error || !vehicle) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/vehicles"
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
              >
                ← Back to Vehicles
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {vehicle.unit_number}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Vehicle Details Form */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Vehicle Information
          </h2>
          <VehicleForm fleetId={fleet.id} vehicle={vehicle} />
        </div>

        {/* Documents Section */}
        <DocumentsSection entityType="vehicle" entityId={vehicle.id} />
      </main>
    </div>
  );
}
