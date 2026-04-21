import type {
  WorkoutBlockInput,
  WorkoutBlockType,
  WorkoutExerciseInput,
  WorkoutSetInput,
  WorkoutWriteInput,
} from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const BLOCK_TYPES = new Set<WorkoutBlockType>(["single", "superset", "circuit"]);

function parseBlockType(v: unknown): WorkoutBlockType | null {
  return typeof v === "string" && BLOCK_TYPES.has(v as WorkoutBlockType)
    ? (v as WorkoutBlockType)
    : null;
}

function parseExercisesArray(raw: unknown, label: string):
  | { ok: true; exercises: WorkoutExerciseInput[] }
  | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: `${label} must be an array.` };
  const exercises: WorkoutExerciseInput[] = [];
  let exPos = 0;
  for (const rawEx of raw) {
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
      let weight_lb: number | null | undefined;
      if (rawSet.weight_lb === null || rawSet.weight_lb === undefined || rawSet.weight_lb === "") {
        weight_lb = null;
      } else {
        const w = typeof rawSet.weight_lb === "number" ? rawSet.weight_lb : Number(rawSet.weight_lb);
        if (!Number.isFinite(w)) return { ok: false, error: "weight_lb must be a number when set." };
        weight_lb = w;
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
        weight_lb: weight_lb ?? null,
        notes: setNotes,
      });
    }
    exercises.push({
      position: exPos++,
      name,
      sets,
    });
  }
  return { ok: true, exercises };
}

function parseOptionalInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
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

  let blocksRaw: unknown;

  if (Array.isArray(body.blocks)) {
    blocksRaw = body.blocks;
  } else if (Array.isArray(body.exercises)) {
    const exParse = parseExercisesArray(body.exercises, "exercises");
    if (!exParse.ok) return exParse;
    blocksRaw = exParse.exercises.map((ex, i) => ({
      position: i,
      type: "single",
      name: null,
      rounds: null,
      rest_seconds: null,
      exercises: [{ ...ex, position: 0 }],
    }));
  } else {
    return { ok: false, error: "Provide blocks (or legacy exercises) array." };
  }

  if (!Array.isArray(blocksRaw)) {
    return { ok: false, error: "blocks must be an array." };
  }

  const blocks: WorkoutBlockInput[] = [];
  let blockPos = 0;
  for (const rawBlock of blocksRaw) {
    if (!isRecord(rawBlock)) return { ok: false, error: "Each block must be an object." };
    const type = parseBlockType(rawBlock.type);
    if (!type) return { ok: false, error: "Each block needs type single, superset, or circuit." };
    const name =
      rawBlock.name === null || rawBlock.name === undefined
        ? null
        : typeof rawBlock.name === "string"
          ? rawBlock.name
          : null;
    const rounds = parseOptionalInt(rawBlock.rounds);
    const rest_seconds = parseOptionalInt(rawBlock.rest_seconds);

    const exParse = parseExercisesArray(rawBlock.exercises, "block.exercises");
    if (!exParse.ok) return exParse;

    blocks.push({
      position: blockPos++,
      type,
      name,
      rounds,
      rest_seconds,
      exercises: exParse.exercises,
    });
  }

  return {
    ok: true,
    value: {
      title,
      started_at,
      notes,
      blocks,
    },
  };
}
