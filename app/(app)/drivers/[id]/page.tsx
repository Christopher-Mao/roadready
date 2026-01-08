import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import DriverForm from "../DriverForm";

export default async function EditDriverPage({
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

  // Get driver
  const { data: driver, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", params.id)
    .eq("fleet_id", fleet.id)
    .single();

  if (error || !driver) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Edit Driver
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <DriverForm fleetId={fleet.id} driver={driver} />
      </main>
    </div>
  );
}
