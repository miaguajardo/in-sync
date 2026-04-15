"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OuraWorkoutSummary } from "@/lib/oura/workout-models";
import type { LinkedSessionPair } from "@/lib/linked-sessions/pairs";
import type { WorkoutBlockRow, WorkoutWithChildren } from "@/lib/workouts/types";
import { totalExerciseCount } from "@/lib/workouts/types";

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

function formatDurationSec(sec: number | undefined): string {
  if (sec === undefined || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s}s`;
}

function blockTypeLabel(t: WorkoutBlockRow["type"]): string {
  switch (t) {
    case "single":
      return "Single";
    case "superset":
      return "Superset";
    case "circuit":
      return "Circuit";
    default:
      return t;
  }
}

type ApiResponse = {
  start_date: string;
  end_date: string;
  oura_status: "ok" | "not_connected" | "upstream";
  oura_error?: string;
  pairs: LinkedSessionPair[];
};

export function LinkedSessionsClient() {
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const clientTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const q = useMemo(
    () =>
      new URLSearchParams({
        start_date: range.start_date,
        end_date: range.end_date,
        time_zone: clientTimeZone,
      }).toString(),
    [range, clientTimeZone],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/linked-sessions?${q}`);
      const json = (await res.json().catch(() => ({}))) as ApiResponse & { hint?: string; error?: string };
      if (!res.ok) {
        setData(null);
        setError(json.hint ?? json.error ?? res.statusText);
        return;
      }
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUnlink(oura_workout_id: string) {
    if (!window.confirm("Remove this link? Your logged workout is not deleted.")) return;
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
    await load();
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const ouraBanner =
    data?.oura_status === "not_connected"
      ? "Oura is not connected. Pair details from the ring will show after you connect from Home."
      : data?.oura_status === "upstream"
        ? data.oura_error ?? "Could not load Oura workouts for this range."
        : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Linked sessions</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ring-detected workouts paired with what you logged. Same date rules as the Oura hub (max 31 days).
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
          onClick={() => void load()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Loading…" : "Reload"}
        </button>
        <Link
          href="/link"
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Link builder
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {ouraBanner && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          {ouraBanner}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </div>
      )}

      {!loading && !error && data && data.pairs.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No linked sessions in this range.{" "}
          <Link href="/link" className="font-medium underline-offset-4 hover:underline">
            Create a link
          </Link>
          .
        </p>
      )}

      <ul className="space-y-6">
        {data?.pairs.map((pair) => (
          <li key={pair.oura_workout_id}>
            <LinkedSessionCard
              pair={pair}
              ouraStatus={data.oura_status}
              expanded={!!expanded[pair.oura_workout_id]}
              onToggleExpand={() => toggleExpand(pair.oura_workout_id)}
              onUnlink={() => void onUnlink(pair.oura_workout_id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkedSessionCard({
  pair,
  ouraStatus,
  expanded,
  onToggleExpand,
  onUnlink,
}: {
  pair: LinkedSessionPair;
  ouraStatus: ApiResponse["oura_status"];
  expanded: boolean;
  onToggleExpand: () => void;
  onUnlink: () => void;
}) {
  const sessionLabel = new Date(pair.session_at).toLocaleString();
  const ouraMissing =
    ouraStatus === "ok" && pair.oura === null
      ? "This Oura workout is not in the fetched range (try widening dates), or it was removed upstream."
      : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <time className="text-sm font-semibold text-zinc-900 dark:text-zinc-50" dateTime={pair.session_at}>
            {sessionLabel}
          </time>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Linked
          </span>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-2 md:divide-x md:divide-zinc-100 dark:md:divide-zinc-900">
        <OuraColumn oura={pair.oura} ouraMissing={ouraMissing} ouraStatus={ouraStatus} />
        <GymColumn gym={pair.gym} expanded={expanded} onToggleExpand={onToggleExpand} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <Link
          href={`/workouts/${pair.workout_id}/edit`}
          className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
        >
          Edit workout
        </Link>
        <button
          type="button"
          onClick={onUnlink}
          className="text-sm font-medium text-red-800 underline-offset-4 hover:underline dark:text-red-300"
        >
          Unlink
        </button>
      </div>
    </article>
  );
}

function OuraColumn({
  oura,
  ouraMissing,
  ouraStatus,
}: {
  oura: OuraWorkoutSummary | null;
  ouraMissing: string | null;
  ouraStatus: ApiResponse["oura_status"];
}) {
  return (
    <div className="space-y-2 border-b border-zinc-100 p-4 dark:border-zinc-900 md:border-b-0">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Oura</h2>
      {ouraStatus !== "ok" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Ring data unavailable for this view.</p>
      )}
      {ouraStatus === "ok" && ouraMissing && (
        <p className="text-sm text-amber-800 dark:text-amber-200/90">{ouraMissing}</p>
      )}
      {oura && (
        <>
          <p className="text-base font-medium capitalize text-zinc-900 dark:text-zinc-50">
            {oura.activity ?? "Workout"}
          </p>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              {oura.start_datetime && oura.end_datetime
                ? `${oura.start_datetime} → ${oura.end_datetime}`
                : oura.day ?? "—"}
            </li>
            <li>Duration: {formatDurationSec(oura.duration)}</li>
            <li>Calories: {oura.calories ?? "—"}</li>
            {oura.intensity && (
              <li className="capitalize">Intensity: {oura.intensity}</li>
            )}
            <li className="capitalize">Source: {oura.source ?? "—"}</li>
          </ul>
        </>
      )}
    </div>
  );
}

function GymColumn({
  gym,
  expanded,
  onToggleExpand,
}: {
  gym: WorkoutWithChildren | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <div className="space-y-2 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Your log</h2>
      {!gym && (
        <p className="text-sm text-amber-800 dark:text-amber-200/90">
          Workout not found — it may have been deleted.
        </p>
      )}
      {gym && (
        <>
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">{gym.title || "Untitled"}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {gym.blocks.length} block{gym.blocks.length === 1 ? "" : "s"} · {totalExerciseCount(gym)} exercise
            {totalExerciseCount(gym) === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Started {new Date(gym.started_at).toLocaleString()}
          </p>
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-sm font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
          >
            {expanded ? "Hide detail" : "Show detail"}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
              {gym.blocks.map((b) => (
                <li key={b.id} className="text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {blockTypeLabel(b.type)}
                    {b.name ? ` · ${b.name}` : ""}
                  </span>
                  {(b.rounds != null || b.rest_seconds != null) && (
                    <span className="ml-2 text-xs text-zinc-500">
                      {b.rounds != null ? `${b.rounds} rounds` : ""}
                      {b.rounds != null && b.rest_seconds != null ? " · " : ""}
                      {b.rest_seconds != null ? `${b.rest_seconds}s rest` : ""}
                    </span>
                  )}
                  <ul className="mt-1 list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-400">
                    {b.exercises.map((ex) => (
                      <li key={ex.id}>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{ex.name}</span>
                        <span className="ml-1 text-xs">
                          (
                          {ex.sets
                            .map((s) => {
                              const w =
                                s.weight_kg != null ? ` @ ${s.weight_kg} kg` : "";
                              return `${s.reps} reps${w}`;
                            })
                            .join(", ")}
                          )
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
