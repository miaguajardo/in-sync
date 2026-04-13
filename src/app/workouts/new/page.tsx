import Link from "next/link";
import { WorkoutForm } from "@/components/workout-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function NewWorkoutPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 sm:px-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New workout</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure Supabase in <code className="text-xs">.env.local</code> first.
        </p>
        <Link href="/workouts" className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New workout</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add exercises, then sets with reps and optional weight.
        </p>
      </div>
      <WorkoutForm mode="create" />
    </div>
  );
}
