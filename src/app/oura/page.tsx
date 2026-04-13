import Link from "next/link";
import { FUTURE_OURA_COLLECTIONS } from "@/lib/oura/future-collections";
import { fetchOuraWorkoutsForDateRange } from "@/lib/oura/fetch-workouts";
import type { OuraWorkoutSummary } from "@/lib/oura/workout-models";
import { resolveSnapshotRange } from "@/lib/oura/snapshot";
import { isOuraConnected } from "@/lib/oura/token-store";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listOuraWorkoutLinks } from "@/lib/workouts/service";

type SearchParams = { start_date?: string; end_date?: string };

export const dynamic = "force-dynamic";

export default async function OuraPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.start_date) q.set("start_date", sp.start_date);
  if (sp.end_date) q.set("end_date", sp.end_date);
  const range = resolveSnapshotRange(q);
  const connected = await isOuraConnected();

  if (!range.ok) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12 sm:px-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Oura hub</h1>
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {range.error}
        </div>
        <Link href="/oura" className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline">
          Reset range
        </Link>
      </div>
    );
  }

  let ouraError: string | null = null;
  let workouts: OuraWorkoutSummary[] = [];
  if (connected) {
    const out = await fetchOuraWorkoutsForDateRange({
      start_date: range.start_date,
      end_date: range.end_date,
    });
    if (!out.ok) {
      if (out.kind === "not_connected") {
        ouraError = "Not connected to Oura.";
      } else {
        ouraError = `Oura request failed (HTTP ${out.status}).`;
      }
    } else {
      workouts = out.workouts;
    }
  } else {
    ouraError = "Connect Oura from the home page to load workouts.";
  }

  const linkedIds = new Set<string>();
  if (isSupabaseConfigured()) {
    try {
      const links = await listOuraWorkoutLinks({
        start_date: range.start_date,
        end_date: range.end_date,
      });
      for (const l of links) linkedIds.add(l.oura_workout_id);
    } catch {
      // ignore link load errors on hub; user can still see Oura workouts
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12 sm:px-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Oura hub</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ring-detected workouts for a date range (max 31 days). More collections can land here next.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Start
          </span>
          <input
            name="start_date"
            type="date"
            defaultValue={range.start_date}
            className="mt-1 block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">End</span>
          <input
            name="end_date"
            type="date"
            defaultValue={range.end_date}
            className="mt-1 block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Apply
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Workouts</h2>
        {ouraError && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            {ouraError}
          </div>
        )}
        {!ouraError && workouts.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No Oura workouts in this range.</p>
        )}
        <ul className="space-y-2">
          {workouts.map((w) => (
            <li
              key={w.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
                  {w.activity ?? "Workout"}
                </span>
                {linkedIds.has(w.id) && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    Linked
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {w.start_datetime && w.end_datetime
                  ? `${w.start_datetime} → ${w.end_datetime}`
                  : w.day ?? w.id}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Source: {w.source ?? "—"} · Calories: {w.calories ?? "—"} · Duration (s):{" "}
                {w.duration ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Coming soon</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FUTURE_OURA_COLLECTIONS.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/40"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{c.label}</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pair sessions on the{" "}
        <Link href="/link" className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200">
          link
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
