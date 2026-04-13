import type { WorkoutExerciseInput, WorkoutSetInput, WorkoutWriteInput } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseWorkoutWriteBody(body: unknown):
  | { ok: true; value: WorkoutWriteInput }
  | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "JSON object required." };
  const title = typeof body.title === "string" ? body.title : "";
  const started_at = typeof body.started_at === "string" ? body.started_at : "";
  const notes =
    body.notes === null || body.notes === undefined
      ? null
      : typeof body.notes === "string"
        ? body.notes
        : null;
  if (!Array.isArray(body.exercises)) {
    return { ok: false, error: "exercises must be an array." };
  }
  const exercises: WorkoutExerciseInput[] = [];
  let exPos = 0;
  for (const rawEx of body.exercises) {
    if (!isRecord(rawEx)) return { ok: false, error: "Each exercise must be an object." };
    const name = typeof rawEx.name === "string" ? rawEx.name : "";
    if (!Array.isArray(rawEx.sets)) return { ok: false, error: "Each exercise needs a sets array." };
    const sets: WorkoutSetInput[] = [];
    let setPos = 0;
    for (const rawSet of rawEx.sets) {
      if (!isRecord(rawSet)) return { ok: false, error: "Each set must be an object." };
      const reps = typeof rawSet.reps === "number" ? rawSet.reps : Number(rawSet.reps);
      if (!Number.isFinite(reps) || reps < 0) {
        return { ok: false, error: "Each set needs a non-negative reps number." };
      }
      let weight_kg: number | null | undefined;
      if (rawSet.weight_kg === null || rawSet.weight_kg === undefined || rawSet.weight_kg === "") {
        weight_kg = null;
      } else {
        const w = typeof rawSet.weight_kg === "number" ? rawSet.weight_kg : Number(rawSet.weight_kg);
        if (!Number.isFinite(w)) return { ok: false, error: "weight_kg must be a number when set." };
        weight_kg = w;
      }
      const setNotes =
        rawSet.notes === null || rawSet.notes === undefined
          ? null
          : typeof rawSet.notes === "string"
            ? rawSet.notes
            : null;
      sets.push({
        position: setPos++,
        reps,
        weight_kg: weight_kg ?? null,
        notes: setNotes,
      });
    }
    exercises.push({
      position: exPos++,
      name,
      sets,
    });
  }
  return {
    ok: true,
    value: {
      title,
      started_at,
      notes,
      exercises,
    },
  };
}
