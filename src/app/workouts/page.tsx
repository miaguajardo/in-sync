import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listWorkouts } from "@/lib/workouts/service";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 sm:px-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Workouts</h1>
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Supabase is not configured. Add{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          to <code className="text-xs">.env.local</code>, apply the SQL migration, then reload.
        </div>
        <Link href="/" className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300">
          Back to home
        </Link>
      </div>
    );
  }

  let workouts: Awaited<ReturnType<typeof listWorkouts>> = [];
  let error: string | null = null;
  try {
    workouts = await listWorkouts({});
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load workouts.";
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Workouts</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Logged gym sessions with exercises and sets.
          </p>
        </div>
        <Link
          href="/workouts/new"
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New workout
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {!error && workouts.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No workouts yet. Create your first one.</p>
      )}

      <ul className="space-y-3">
        {workouts.map((w) => (
          <li key={w.id}>
            <Link
              href={`/workouts/${w.id}/edit`}
              className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{w.title || "Untitled"}</span>
                <time className="text-xs text-zinc-500 dark:text-zinc-400" dateTime={w.started_at}>
                  {new Date(w.started_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {w.exercises.length} exercise{w.exercises.length === 1 ? "" : "s"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
