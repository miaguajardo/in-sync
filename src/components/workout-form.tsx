"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkoutBlockType, WorkoutWithChildren, WorkoutWriteInput } from "@/lib/workouts/types";

type SetDraft = { reps: string; weight_kg: string; notes: string };
type ExerciseDraft = { name: string; sets: SetDraft[] };

type BlockDraft = {
  type: WorkoutBlockType;
  name: string;
  rounds: string;
  restSeconds: string;
  exercises: ExerciseDraft[];
};

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

function defaultExercise(): ExerciseDraft {
  return {
    name: "",
    sets: [{ reps: "10", weight_kg: "", notes: "" }],
  };
}

function defaultSingleBlock(): BlockDraft {
  return {
    type: "single",
    name: "",
    rounds: "",
    restSeconds: "",
    exercises: [defaultExercise()],
  };
}

function defaultSupersetBlock(): BlockDraft {
  return {
    type: "superset",
    name: "",
    rounds: "",
    restSeconds: "90",
    exercises: [defaultExercise(), { name: "", sets: [{ reps: "10", weight_kg: "", notes: "" }] }],
  };
}

function defaultCircuitBlock(): BlockDraft {
  return {
    type: "circuit",
    name: "",
    rounds: "3",
    restSeconds: "",
    exercises: [
      defaultExercise(),
      { name: "", sets: [{ reps: "15", weight_kg: "", notes: "" }] },
    ],
  };
}

function parseOptionalPositiveInt(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function parseOptionalNonNegInt(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function buildPayload(
  title: string,
  startedLocal: string,
  notes: string,
  blocks: BlockDraft[],
): WorkoutWriteInput {
  const blocksOut = blocks.map((b, blockIdx) => ({
    position: blockIdx,
    type: b.type,
    name: b.name.trim() ? b.name.trim() : null,
    rounds: parseOptionalPositiveInt(b.rounds),
    rest_seconds: parseOptionalNonNegInt(b.restSeconds),
    exercises: b.exercises.map((ex, ei) => ({
      position: ei,
      name: ex.name,
      sets: ex.sets.map((s, si) => {
        const wRaw = s.weight_kg.trim();
        const wNum = wRaw === "" ? null : Number(wRaw);
        return {
          position: si,
          reps: Math.max(0, Math.floor(Number(s.reps)) || 0),
          weight_kg: wNum !== null && Number.isFinite(wNum) ? wNum : null,
          notes: s.notes.trim() ? s.notes : null,
        };
      }),
    })),
  }));
  return {
    title,
    started_at: fromDatetimeLocalValue(startedLocal),
    notes: notes.trim() ? notes : null,
    blocks: blocksOut,
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
  const [blocks, setBlocks] = useState<BlockDraft[]>([defaultSingleBlock()]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(props.mode === "edit");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const applyWorkout = useCallback((w: WorkoutWithChildren) => {
    setTitle(w.title);
    setStartedLocal(toDatetimeLocalValue(w.started_at));
    setNotes(w.notes ?? "");
    setBlocks(
      w.blocks.length
        ? w.blocks.map((b) => ({
            type: b.type,
            name: b.name ?? "",
            rounds: b.rounds != null ? String(b.rounds) : "",
            restSeconds: b.rest_seconds != null ? String(b.rest_seconds) : "",
            exercises: b.exercises.map((ex) => ({
              name: ex.name,
              sets: ex.sets.map((s) => ({
                reps: String(s.reps),
                weight_kg: s.weight_kg === null || s.weight_kg === undefined ? "" : String(s.weight_kg),
                notes: s.notes ?? "",
              })),
            })),
          }))
        : [defaultSingleBlock()],
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
    () => buildPayload(title, startedLocal, notes, blocks),
    [title, startedLocal, notes, blocks],
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

  function addBlock(kind: WorkoutBlockType) {
    setBlocks((prev) => [
      ...prev,
      kind === "single"
        ? defaultSingleBlock()
        : kind === "superset"
          ? defaultSupersetBlock()
          : defaultCircuitBlock(),
    ]);
  }

  function removeBlock(blockIdx: number) {
    setBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== blockIdx)));
  }

  function setBlockType(blockIdx: number, type: WorkoutBlockType) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        let exercises = b.exercises;
        if (type === "single") {
          exercises = [exercises[0] ?? defaultExercise()];
        } else if (exercises.length < 2) {
          exercises = [...exercises, defaultExercise()];
        }
        return {
          ...b,
          type,
          exercises,
          rounds: type === "circuit" && !b.rounds.trim() ? "3" : b.rounds,
        };
      }),
    );
  }

  function updateBlockField(blockIdx: number, patch: Partial<Pick<BlockDraft, "name" | "rounds" | "restSeconds">>) {
    setBlocks((prev) => prev.map((b, i) => (i === blockIdx ? { ...b, ...patch } : b)));
  }

  function addExerciseToBlock(blockIdx: number) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        if (b.type === "single" && b.exercises.length >= 1) return b;
        return { ...b, exercises: [...b.exercises, defaultExercise()] };
      }),
    );
  }

  function removeExerciseFromBlock(blockIdx: number, exIdx: number) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        const min = b.type === "single" ? 1 : 2;
        if (b.exercises.length <= min) return b;
        return { ...b, exercises: b.exercises.filter((_, j) => j !== exIdx) };
      }),
    );
  }

  function updateExerciseName(blockIdx: number, exIdx: number, name: string) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          exercises: b.exercises.map((ex, j) => (j === exIdx ? { ...ex, name } : ex)),
        };
      }),
    );
  }

  function addSet(blockIdx: number, exIdx: number) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          exercises: b.exercises.map((ex, j) =>
            j === exIdx
              ? { ...ex, sets: [...ex.sets, { reps: "10", weight_kg: "", notes: "" }] }
              : ex,
          ),
        };
      }),
    );
  }

  function removeSet(blockIdx: number, exIdx: number, setIdx: number) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          exercises: b.exercises.map((ex, j) => {
            if (j !== exIdx) return ex;
            if (ex.sets.length <= 1) return ex;
            return { ...ex, sets: ex.sets.filter((_, k) => k !== setIdx) };
          }),
        };
      }),
    );
  }

  function updateSet(
    blockIdx: number,
    exIdx: number,
    setIdx: number,
    patch: Partial<SetDraft>,
  ) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          exercises: b.exercises.map((ex, j) => {
            if (j !== exIdx) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s, k) => (k === setIdx ? { ...s, ...patch } : s)),
            };
          }),
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Blocks</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addBlock("single")}
              className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              + Single
            </button>
            <button
              type="button"
              onClick={() => addBlock("superset")}
              className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              + Superset
            </button>
            <button
              type="button"
              onClick={() => addBlock("circuit")}
              className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              + Circuit
            </button>
          </div>
        </div>

        {blocks.map((block, blockIdx) => (
          <div
            key={blockIdx}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-900">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Type
                  <select
                    className="ml-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={block.type}
                    onChange={(e) => setBlockType(blockIdx, e.target.value as WorkoutBlockType)}
                  >
                    <option value="single">Single</option>
                    <option value="superset">Superset</option>
                    <option value="circuit">Circuit</option>
                  </select>
                </label>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {block.type === "single" && "One exercise"}
                  {block.type === "superset" && "Alternate two or more moves"}
                  {block.type === "circuit" && "Two or more moves; optional rounds"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeBlock(blockIdx)}
                className="rounded-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                Remove block
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Block label</span>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={block.name}
                  onChange={(e) => updateBlockField(blockIdx, { name: e.target.value })}
                  placeholder="Optional (e.g. A1/A2)"
                />
              </label>
              {(block.type === "superset" || block.type === "circuit") && (
                <label className="block">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Rounds</span>
                  <input
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={block.rounds}
                    onChange={(e) => updateBlockField(blockIdx, { rounds: e.target.value })}
                    placeholder="Optional"
                  />
                  <span className="mt-1 block text-xs text-zinc-500">Optional note for programming; not enforced on sets.</span>
                </label>
              )}
              <label className="block">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Rest (sec)</span>
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  value={block.restSeconds}
                  onChange={(e) => updateBlockField(blockIdx, { restSeconds: e.target.value })}
                  placeholder="Optional"
                />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Exercises in this block</h3>
                {block.type !== "single" && (
                  <button
                    type="button"
                    onClick={() => addExerciseToBlock(blockIdx)}
                    className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
                  >
                    Add exercise
                  </button>
                )}
              </div>

              {block.exercises.map((ex, exIdx) => (
                <div
                  key={exIdx}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <label className="block min-w-[200px] flex-1">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Exercise {block.exercises.length > 1 ? exIdx + 1 : ""}
                      </span>
                      <input
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                        value={ex.name}
                        onChange={(e) => updateExerciseName(blockIdx, exIdx, e.target.value)}
                        placeholder="Movement name"
                        required
                      />
                    </label>
                    {(block.type !== "single" || block.exercises.length > 1) && (
                      <button
                        type="button"
                        onClick={() => removeExerciseFromBlock(blockIdx, exIdx)}
                        className="text-sm text-red-700 hover:underline dark:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sets</span>
                      <button
                        type="button"
                        onClick={() => addSet(blockIdx, exIdx)}
                        className="text-xs font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
                      >
                        Add set
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            <th className="py-2 pr-3 font-medium">Reps</th>
                            <th className="py-2 pr-3 font-medium">Weight (lb)</th>
                            <th className="py-2 pr-3 font-medium">Notes</th>
                            <th className="py-2 font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {ex.sets.map((s, setIdx) => (
                            <tr key={setIdx} className="border-t border-zinc-200 dark:border-zinc-800">
                              <td className="py-2 pr-3 align-top">
                                <input
                                  inputMode="numeric"
                                  className="w-20 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                                  value={s.reps}
                                  onChange={(e) =>
                                    updateSet(blockIdx, exIdx, setIdx, { reps: e.target.value })
                                  }
                                  required
                                />
                              </td>
                              <td className="py-2 pr-3 align-top">
                                <input
                                  inputMode="decimal"
                                  className="w-24 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                                  value={s.weight_kg}
                                  onChange={(e) =>
                                    updateSet(blockIdx, exIdx, setIdx, { weight_kg: e.target.value })
                                  }
                                  placeholder="—"
                                />
                              </td>
                              <td className="py-2 pr-3 align-top">
                                <input
                                  className="w-full min-w-[140px] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                                  value={s.notes}
                                  onChange={(e) =>
                                    updateSet(blockIdx, exIdx, setIdx, { notes: e.target.value })
                                  }
                                  placeholder="Optional"
                                />
                              </td>
                              <td className="py-2 align-top text-right">
                                <button
                                  type="button"
                                  onClick={() => removeSet(blockIdx, exIdx, setIdx)}
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
