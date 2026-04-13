"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkoutWithChildren, WorkoutWriteInput } from "@/lib/workouts/types";

type SetDraft = { reps: string; weight_kg: string; notes: string };
type ExerciseDraft = { name: string; sets: SetDraft[] };

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return new Date().toISOString();
  return new Date(value).toISOString();
}

function defaultDraft(): ExerciseDraft {
  return {
    name: "",
    sets: [{ reps: "10", weight_kg: "", notes: "" }],
  };
}

function buildPayload(
  title: string,
  startedLocal: string,
  notes: string,
  exercises: ExerciseDraft[],
): WorkoutWriteInput {
  const exercisesOut = exercises.map((ex, i) => ({
    position: i,
    name: ex.name,
    sets: ex.sets.map((s, j) => {
      const wRaw = s.weight_kg.trim();
      const wNum = wRaw === "" ? null : Number(wRaw);
      return {
        position: j,
        reps: Math.max(0, Math.floor(Number(s.reps)) || 0),
        weight_kg: wNum !== null && Number.isFinite(wNum) ? wNum : null,
        notes: s.notes.trim() ? s.notes : null,
      };
    }),
  }));
  return {
    title,
    started_at: fromDatetimeLocalValue(startedLocal),
    notes: notes.trim() ? notes : null,
    exercises: exercisesOut,
  };
}

type Props =
  | { mode: "create" }
  | { mode: "edit"; workoutId: string };

export function WorkoutForm(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startedLocal, setStartedLocal] = useState(() =>
    toDatetimeLocalValue(new Date().toISOString()),
  );
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([defaultDraft()]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(props.mode === "edit");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const applyWorkout = useCallback((w: WorkoutWithChildren) => {
    setTitle(w.title);
    setStartedLocal(toDatetimeLocalValue(w.started_at));
    setNotes(w.notes ?? "");
    setExercises(
      w.exercises.length
        ? w.exercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets.map((s) => ({
              reps: String(s.reps),
              weight_kg: s.weight_kg === null || s.weight_kg === undefined ? "" : String(s.weight_kg),
              notes: s.notes ?? "",
            })),
          }))
        : [defaultDraft()],
    );
  }, []);

  useEffect(() => {
    if (props.mode !== "edit") return;
    let cancelled = false;
    (async () => {
      setLoadError(null);
      setLoading(true);
      const res = await fetch(`/api/workouts/${props.workoutId}`);
      const json = (await res.json().catch(() => ({}))) as {
        workout?: WorkoutWithChildren;
        hint?: string;
      };
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(json.hint ?? res.statusText);
        setLoading(false);
        return;
      }
      if (json.workout) applyWorkout(json.workout);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [props, applyWorkout]);

  const canDelete = props.mode === "edit";

  const payload = useMemo(
    () => buildPayload(title, startedLocal, notes, exercises),
    [title, startedLocal, notes, exercises],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const url = props.mode === "create" ? "/api/workouts" : `/api/workouts/${props.workoutId}`;
      const res = await fetch(url, {
        method: props.mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { hint?: string };
      if (!res.ok) {
        setSaveError(json.hint ?? res.statusText);
        return;
      }
      router.push("/workouts");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (props.mode !== "edit") return;
    if (!window.confirm("Delete this workout? Linked Oura rows will unlink via cascade.")) return;
    setSaveError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/workouts/${props.workoutId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { hint?: string };
        setSaveError(json.hint ?? res.statusText);
        return;
      }
      router.push("/workouts");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function addExercise() {
    setExercises((prev) => [...prev, defaultDraft()]);
  }

  function removeExercise(idx: number) {
    setExercises((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function updateExerciseName(idx: number, name: string) {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, name } : ex)));
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, { reps: "10", weight_kg: "", notes: "" }] } : ex,
      ),
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        if (ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) };
      }),
    );
  }

  function updateSet(exIdx: number, setIdx: number, patch: Partial<SetDraft>) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)),
        };
      }),
    );
  }

  if (props.mode === "edit" && loadError) {
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
        Could not load workout: {loadError}
      </div>
    );
  }

  if (props.mode === "edit" && loading) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading workout…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Title</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Push day"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Started</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            value={startedLocal}
            onChange={(e) => setStartedLocal(e.target.value)}
            required
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Notes</span>
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Exercises</h2>
          <button
            type="button"
            onClick={addExercise}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Add exercise
          </button>
        </div>

        {exercises.map((ex, exIdx) => (
          <div
            key={exIdx}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="block min-w-[200px] flex-1">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Exercise</span>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                  placeholder="Bench press"
                  required
                />
              </label>
              <button
                type="button"
                onClick={() => removeExercise(exIdx)}
                className="rounded-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                Remove
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sets</span>
                <button
                  type="button"
                  onClick={() => addSet(exIdx)}
                  className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
                >
                  Add set
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 pr-3 font-medium">Reps</th>
                      <th className="py-2 pr-3 font-medium">Weight (kg)</th>
                      <th className="py-2 pr-3 font-medium">Notes</th>
                      <th className="py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s, setIdx) => (
                      <tr key={setIdx} className="border-t border-zinc-100 dark:border-zinc-900">
                        <td className="py-2 pr-3 align-top">
                          <input
                            inputMode="numeric"
                            className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                            value={s.reps}
                            onChange={(e) => updateSet(exIdx, setIdx, { reps: e.target.value })}
                            required
                          />
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <input
                            inputMode="decimal"
                            className="w-24 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                            value={s.weight_kg}
                            onChange={(e) => updateSet(exIdx, setIdx, { weight_kg: e.target.value })}
                            placeholder="—"
                          />
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <input
                            className="w-full min-w-[140px] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                            value={s.notes}
                            onChange={(e) => updateSet(exIdx, setIdx, { notes: e.target.value })}
                            placeholder="Optional"
                          />
                        </td>
                        <td className="py-2 align-top text-right">
                          <button
                            type="button"
                            onClick={() => removeSet(exIdx, setIdx)}
                            className="text-xs font-medium text-red-700 hover:underline dark:text-red-300"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {saveError && (
        <div
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {saveError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || deleting || (props.mode === "edit" && !!loadError)}
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {saving ? "Saving…" : props.mode === "create" ? "Create workout" : "Save changes"}
        </button>
        <Link
          href="/workouts"
          className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Cancel
        </Link>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || saving}
            className="ml-auto inline-flex h-11 items-center justify-center rounded-full border border-red-200 px-6 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/30"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
