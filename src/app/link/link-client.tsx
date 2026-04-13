"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OuraWorkoutSummary } from "@/lib/oura/workout-models";
import type { WorkoutRow } from "@/lib/workouts/types";

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange(): { start_date: string; end_date: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start_date: ymdLocal(start), end_date: ymdLocal(end) };
}

type LinkRow = {
  oura_workout_id: string;
  workout_id: string;
  created_at: string;
  workout: { title: string; started_at: string };
};

export function LinkPageClient() {
  const [range, setRange] = useState(defaultRange);
  const [ouraWorkouts, setOuraWorkouts] = useState<OuraWorkoutSummary[]>([]);
  const [gymWorkouts, setGymWorkouts] = useState<WorkoutRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [selectedOuraId, setSelectedOuraId] = useState<string | null>(null);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const q = useMemo(
    () =>
      new URLSearchParams({
        start_date: range.start_date,
        end_date: range.end_date,
      }).toString(),
    [range],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ouraRes, gymRes, linkRes] = await Promise.all([
        fetch(`/api/oura/workouts?${q}`),
        fetch(`/api/workouts?${q}`),
        fetch(`/api/oura-workout-links?${q}`),
      ]);

      const messages: string[] = [];

      if (ouraRes.status === 401) {
        setOuraWorkouts([]);
        messages.push("Oura is not connected. Connect from the home page first.");
      } else if (!ouraRes.ok) {
        setOuraWorkouts([]);
        const j = (await ouraRes.json().catch(() => ({}))) as { hint?: string };
        messages.push(j.hint ?? `Oura request failed (${ouraRes.status}).`);
      } else {
        const j = (await ouraRes.json()) as { workouts: OuraWorkoutSummary[] };
        setOuraWorkouts(j.workouts ?? []);
      }

      if (gymRes.status === 503) {
        setGymWorkouts([]);
        messages.push("Supabase is not configured on the server.");
      } else if (!gymRes.ok) {
        setGymWorkouts([]);
        const j = (await gymRes.json().catch(() => ({}))) as { hint?: string };
        messages.push(j.hint ?? `Workouts request failed (${gymRes.status}).`);
      } else {
        const j = (await gymRes.json()) as {
          workouts: (WorkoutRow & { exercises?: unknown[] })[];
        };
        setGymWorkouts(
          (j.workouts ?? []).map((w) => ({
            id: w.id,
            title: w.title,
            started_at: w.started_at,
            notes: w.notes,
            created_at: w.created_at,
          })),
        );
      }

      if (linkRes.ok) {
        const j = (await linkRes.json()) as { links: LinkRow[] };
        setLinks(j.links ?? []);
      } else {
        setLinks([]);
        if (linkRes.status === 503) {
          messages.push("Links could not load: Supabase is not configured.");
        }
      }

      setError(messages.length ? messages.join(" ") : null);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onLink() {
    setActionError(null);
    if (!selectedOuraId || !selectedGymId) {
      setActionError("Select an Oura workout and a logged workout.");
      return;
    }
    setLinking(true);
    try {
      const res = await fetch("/api/oura-workout-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oura_workout_id: selectedOuraId,
          workout_id: selectedGymId,
          start_date: range.start_date,
          end_date: range.end_date,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { hint?: string; error?: string };
      if (!res.ok) {
        setActionError(j.hint ?? j.error ?? res.statusText);
        return;
      }
      setSelectedOuraId(null);
      setSelectedGymId(null);
      await refresh();
    } finally {
      setLinking(false);
    }
  }

  async function onUnlink(oura_workout_id: string) {
    setActionError(null);
    const res = await fetch(
      `/api/oura-workout-links?oura_workout_id=${encodeURIComponent(oura_workout_id)}`,
      { method: "DELETE" },
    );
    const j = (await res.json().catch(() => ({}))) as { hint?: string };
    if (!res.ok) {
      setActionError(j.hint ?? res.statusText);
      return;
    }
    await refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Link workouts</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Choose an Oura-detected session and the gym workout you logged for it.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Start
          </span>
          <input
            type="date"
            value={range.start_date}
            onChange={(e) => setRange((r) => ({ ...r, start_date: e.target.value }))}
            className="mt-1 block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">End</span>
          <input
            type="date"
            value={range.end_date}
            onChange={(e) => setRange((r) => ({ ...r, end_date: e.target.value }))}
            className="mt-1 block rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Oura workouts
          </h2>
          <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {ouraWorkouts.map((w) => {
              const active = selectedOuraId === w.id;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedOuraId(w.id)}
                    className={`w-full rounded-2xl border p-3 text-left text-sm transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span className="font-medium capitalize">{w.activity ?? "Workout"}</span>
                    <p className={`mt-1 text-xs ${active ? "text-zinc-200 dark:text-zinc-700" : "text-zinc-500"}`}>
                      {w.start_datetime ?? w.day ?? w.id}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Logged workouts
          </h2>
          <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {gymWorkouts.map((w) => {
              const active = selectedGymId === w.id;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedGymId(w.id)}
                    className={`w-full rounded-2xl border p-3 text-left text-sm transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span className="font-medium">{w.title || "Untitled"}</span>
                    <p className={`mt-1 text-xs ${active ? "text-zinc-200 dark:text-zinc-700" : "text-zinc-500"}`}>
                      {new Date(w.started_at).toLocaleString()}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onLink()}
          disabled={linking || loading}
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {linking ? "Linking…" : "Create link"}
        </button>
        <Link
          href="/workouts/new"
          className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
        >
          Log a new workout
        </Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Existing links</h2>
        {links.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No links in this date window.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li
                key={l.oura_workout_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Oura <span className="font-mono text-xs">{l.oura_workout_id}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    → {l.workout.title || "Untitled"} · {new Date(l.workout.started_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onUnlink(l.oura_workout_id)}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/30"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
