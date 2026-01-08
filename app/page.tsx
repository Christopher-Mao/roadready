import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">RoadReady</h1>
        <p className="text-xl mb-8 text-center">
          Know who&apos;s road-ready. Every day.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
