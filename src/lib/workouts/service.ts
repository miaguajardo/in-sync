import type { SupabaseClient } from "@supabase/supabase-js";
import { inclusiveLocalDayBoundsAsIso } from "@/lib/datetime/zoned-day-bounds";
import type {
  OuraWorkoutLinkRow,
  WorkoutBlockInput,
  WorkoutBlockRow,
  WorkoutBlockType,
  WorkoutWithChildren,
  WorkoutWriteInput,
} from "./types";

function assertWorkoutInput(input: WorkoutWriteInput): string | null {
  if (!input.title.trim()) return "title is required.";
  if (!input.started_at) return "started_at is required.";
  const d = Date.parse(input.started_at);
  if (!Number.isFinite(d)) return "started_at must be a valid ISO datetime.";
  if (!input.blocks.length) return "At least one block is required.";
  for (const block of input.blocks) {
    if (block.rounds !== null && block.rounds !== undefined) {
      if (!Number.isFinite(block.rounds) || block.rounds < 1) {
        return "Block rounds must be a positive integer when set.";
      }
    }
    if (block.rest_seconds !== null && block.rest_seconds !== undefined) {
      if (!Number.isFinite(block.rest_seconds) || block.rest_seconds < 0) {
        return "Block rest_seconds must be a non-negative integer when set.";
      }
    }
    const n = block.exercises.length;
    if (!n) return "Each block needs at least one exercise.";
    if (block.type === "single" && n !== 1) return "A single block must have exactly one exercise.";
    if ((block.type === "superset" || block.type === "circuit") && n < 2) {
      return `${block.type} blocks need at least two exercises.`;
    }
    for (const ex of block.exercises) {
      if (!ex.name.trim()) return "Each exercise needs a name.";
      if (!ex.sets.length) return "Each exercise needs at least one set.";
      for (const s of ex.sets) {
        if (!Number.isFinite(s.reps) || s.reps < 0) return "Set reps must be a non-negative number.";
      }
    }
  }
  return null;
}

function sortByPosition<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

async function loadSetsForExerciseIds(
  sb: SupabaseClient,
  exerciseIds: string[],
): Promise<Map<string, WorkoutBlockRow["exercises"][0]["sets"]>> {
  const setsByExercise = new Map<string, WorkoutBlockRow["exercises"][0]["sets"]>();
  if (!exerciseIds.length) return setsByExercise;
  const { data: sets, error: sErr } = await sb
    .from("workout_sets")
    .select("*")
    .in("workout_exercise_id", exerciseIds)
    .order("position", { ascending: true });
  if (sErr) throw sErr;
  for (const row of sets ?? []) {
    const exId = row.workout_exercise_id as string;
    const list = setsByExercise.get(exId) ?? [];
    list.push({
      id: row.id as string,
      workout_exercise_id: exId,
      position: row.position as number,
      reps: row.reps as number,
      weight_lb: row.weight_lb as number | null,
      notes: row.notes as string | null,
    });
    setsByExercise.set(exId, list);
  }
  return setsByExercise;
}

function assembleWorkoutsWithBlocks(
  workouts: { id: string; title: string; started_at: string; notes: string | null; created_at: string }[],
  blockRows: {
    id: string;
    workout_id: string;
    position: number;
    type: string;
    name: string | null;
    rounds: number | null;
    rest_seconds: number | null;
  }[],
  exerciseRows: {
    id: string;
    workout_block_id: string;
    position: number;
    name: string;
  }[],
  setsByExercise: Map<string, WorkoutBlockRow["exercises"][0]["sets"]>,
): WorkoutWithChildren[] {
  const exercisesByBlock = new Map<string, WorkoutBlockRow["exercises"]>();
  const exByBlock = new Map<string, typeof exerciseRows>();
  for (const row of exerciseRows) {
    const bid = row.workout_block_id;
    const list = exByBlock.get(bid) ?? [];
    list.push(row);
    exByBlock.set(bid, list);
  }
  for (const [bid, rows] of exByBlock) {
    const sorted = sortByPosition(rows);
    exercisesByBlock.set(
      bid,
      sorted.map((row) => ({
        id: row.id,
        workout_block_id: bid,
        position: row.position,
        name: row.name,
        sets: setsByExercise.get(row.id) ?? [],
      })),
    );
  }

  const blocksByWorkoutId = new Map<string, typeof blockRows>();
  for (const row of blockRows) {
    const wid = row.workout_id;
    const list = blocksByWorkoutId.get(wid) ?? [];
    list.push(row);
    blocksByWorkoutId.set(wid, list);
  }

  const blocksByWorkout = new Map<string, WorkoutBlockRow[]>();
  for (const [wid, rows] of blocksByWorkoutId) {
    blocksByWorkout.set(
      wid,
      sortByPosition(rows).map((row) => ({
        id: row.id,
        workout_id: wid,
        position: row.position,
        type: row.type as WorkoutBlockType,
        name: row.name,
        rounds: row.rounds,
        rest_seconds: row.rest_seconds,
        exercises: exercisesByBlock.get(row.id) ?? [],
      })),
    );
  }

  return workouts.map((w) => ({
    id: w.id,
    title: w.title,
    started_at: w.started_at,
    notes: w.notes,
    created_at: w.created_at,
    blocks: blocksByWorkout.get(w.id) ?? [],
  }));
}

export async function listWorkouts(
  sb: SupabaseClient,
  params: {
    start_date?: string;
    end_date?: string;
    time_zone?: string | null;
  },
): Promise<WorkoutWithChildren[]> {
  let q = sb.from("workouts").select("*").order("started_at", { ascending: false });
  if (params.start_date && params.end_date) {
    const { start, end } = inclusiveLocalDayBoundsAsIso(
      params.start_date,
      params.end_date,
      params.time_zone,
    );
    q = q.gte("started_at", start).lte("started_at", end);
  }
  const { data: workouts, error } = await q;
  if (error) throw error;
  if (!workouts?.length) return [];
  const ids = workouts.map((w) => w.id as string);

  const { data: blockRows, error: bErr } = await sb
    .from("workout_blocks")
    .select("*")
    .in("workout_id", ids);
  if (bErr) throw bErr;
  const allBlocks = blockRows ?? [];

  const blockIds = allBlocks.map((b) => b.id as string);
  let exerciseRows: {
    id: string;
    workout_block_id: string;
    position: number;
    name: string;
  }[] = [];
  if (blockIds.length) {
    const { data: ex, error: eErr } = await sb
      .from("workout_exercises")
      .select("id, workout_block_id, position, name")
      .in("workout_block_id", blockIds);
    if (eErr) throw eErr;
    exerciseRows = (ex ?? []) as typeof exerciseRows;
  }

  const exerciseIds = exerciseRows.map((e) => e.id);
  const setsByExercise = await loadSetsForExerciseIds(sb, exerciseIds);

  return assembleWorkoutsWithBlocks(
    workouts as Parameters<typeof assembleWorkoutsWithBlocks>[0],
    allBlocks as Parameters<typeof assembleWorkoutsWithBlocks>[1],
    exerciseRows,
    setsByExercise,
  );
}

export async function getWorkoutById(
  sb: SupabaseClient,
  id: string,
): Promise<WorkoutWithChildren | null> {
  const { data: w, error } = await sb.from("workouts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!w) return null;

  const { data: blockRows, error: bErr } = await sb
    .from("workout_blocks")
    .select("*")
    .eq("workout_id", id)
    .order("position", { ascending: true });
  if (bErr) throw bErr;
  const sortedBlocks = blockRows ?? [];
  const blockIds = sortedBlocks.map((b) => b.id as string);

  let exerciseRows: {
    id: string;
    workout_block_id: string;
    position: number;
    name: string;
  }[] = [];
  if (blockIds.length) {
    const { data: ex, error: eErr } = await sb
      .from("workout_exercises")
      .select("id, workout_block_id, position, name")
      .in("workout_block_id", blockIds);
    if (eErr) throw eErr;
    exerciseRows = (ex ?? []) as typeof exerciseRows;
  }

  const exerciseIds = exerciseRows.map((e) => e.id);
  const setsByExercise = await loadSetsForExerciseIds(sb, exerciseIds);

  const [assembled] = assembleWorkoutsWithBlocks(
    [
      {
        id: w.id as string,
        title: w.title as string,
        started_at: w.started_at as string,
        notes: w.notes as string | null,
        created_at: w.created_at as string,
      },
    ],
    sortedBlocks as Parameters<typeof assembleWorkoutsWithBlocks>[1],
    exerciseRows,
    setsByExercise,
  );
  return assembled ?? null;
}

async function insertBlocksAndChildren(
  sb: SupabaseClient,
  workoutId: string,
  blocks: WorkoutBlockInput[],
): Promise<void> {
  const sortedBlocks = sortByPosition(blocks);
  const blockRows = sortedBlocks.map((b) => ({
    workout_id: workoutId,
    position: b.position,
    type: b.type,
    name: b.name?.trim() ? b.name.trim() : null,
    rounds: b.rounds ?? null,
    rest_seconds: b.rest_seconds ?? null,
  }));
  const { data: insertedBlocks, error: bInsErr } = await sb
    .from("workout_blocks")
    .insert(blockRows)
    .select("id, position");
  if (bInsErr) throw bInsErr;
  const blockIdByPosition = new Map<number, string>();
  for (const row of sortByPosition(insertedBlocks ?? [])) {
    blockIdByPosition.set(row.position as number, row.id as string);
  }

  for (const block of sortedBlocks) {
    const blockId = blockIdByPosition.get(block.position);
    if (!blockId) throw new Error("Failed to resolve inserted block id.");

    const exerciseRows = block.exercises.map((e) => ({
      workout_block_id: blockId,
      position: e.position,
      name: e.name.trim(),
    }));
    const { data: insertedEx, error: insExErr } = await sb
      .from("workout_exercises")
      .insert(exerciseRows)
      .select("id, position");
    if (insExErr) throw insExErr;
    const exIdByPosition = new Map<number, string>();
    for (const row of sortByPosition(insertedEx ?? [])) {
      exIdByPosition.set(row.position as number, row.id as string);
    }

    const setRows: {
      workout_exercise_id: string;
      position: number;
      reps: number;
      weight_lb: number | null;
      notes: string | null;
    }[] = [];
    for (const ex of block.exercises) {
      const exId = exIdByPosition.get(ex.position);
      if (!exId) throw new Error("Failed to resolve inserted exercise id.");
      for (const s of ex.sets) {
        setRows.push({
          workout_exercise_id: exId,
          position: s.position,
          reps: s.reps,
          weight_lb: s.weight_lb ?? null,
          notes: s.notes?.trim() ? s.notes.trim() : null,
        });
      }
    }
    if (setRows.length) {
      const { error: insSetErr } = await sb.from("workout_sets").insert(setRows);
      if (insSetErr) throw insSetErr;
    }
  }
}

export async function createWorkout(
  sb: SupabaseClient,
  userId: string,
  input: WorkoutWriteInput,
): Promise<{ ok: true; workout: WorkoutWithChildren } | { ok: false; error: string }> {
  const err = assertWorkoutInput(input);
  if (err) return { ok: false, error: err };
  const { data: w, error } = await sb
    .from("workouts")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      started_at: input.started_at,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select("*")
    .single();
  if (error) throw error;
  const workoutId = w.id as string;
  try {
    await insertBlocksAndChildren(sb, workoutId, input.blocks);
  } catch (e) {
    await sb.from("workouts").delete().eq("id", workoutId);
    throw e;
  }
  const full = await getWorkoutById(sb, workoutId);
  if (!full) throw new Error("Workout missing after insert.");
  return { ok: true, workout: full };
}

export async function updateWorkout(
  sb: SupabaseClient,
  id: string,
  input: WorkoutWriteInput,
): Promise<
  | { kind: "ok"; workout: WorkoutWithChildren }
  | { kind: "not_found" }
  | { kind: "invalid"; error: string }
> {
  const err = assertWorkoutInput(input);
  if (err) return { kind: "invalid", error: err };
  const existing = await getWorkoutById(sb, id);
  if (!existing) return { kind: "not_found" };
  const { error: uErr } = await sb
    .from("workouts")
    .update({
      title: input.title.trim(),
      started_at: input.started_at,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .eq("id", id);
  if (uErr) throw uErr;
  const { error: delErr } = await sb.from("workout_blocks").delete().eq("workout_id", id);
  if (delErr) throw delErr;
  await insertBlocksAndChildren(sb, id, input.blocks);
  const full = await getWorkoutById(sb, id);
  if (!full) throw new Error("Workout missing after update.");
  return { kind: "ok", workout: full };
}

export async function deleteWorkout(sb: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await sb.from("workouts").delete().eq("id", id).select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export type OuraLinkWithWorkout = OuraWorkoutLinkRow & {
  workout: { title: string; started_at: string };
};

export async function listOuraWorkoutLinks(
  sb: SupabaseClient,
  params: {
    start_date: string;
    end_date: string;
    time_zone?: string | null;
  },
): Promise<OuraLinkWithWorkout[]> {
  const { start, end } = inclusiveLocalDayBoundsAsIso(
    params.start_date,
    params.end_date,
    params.time_zone,
  );
  const { data, error } = await sb.from("oura_workout_links").select(`
      oura_workout_id,
      workout_id,
      created_at,
      workouts ( title, started_at )
    `);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    oura_workout_id: string;
    workout_id: string;
    created_at: string;
    workouts: { title: string; started_at: string } | null;
  }[];
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  return rows
    .filter((r) => {
      const st = r.workouts?.started_at;
      if (!st) return false;
      const t = Date.parse(st);
      return Number.isFinite(t) && t >= startMs && t <= endMs;
    })
    .map((r) => ({
      oura_workout_id: r.oura_workout_id,
      workout_id: r.workout_id,
      created_at: r.created_at,
      workout: r.workouts as { title: string; started_at: string },
    }));
}

export async function insertOuraWorkoutLink(
  sb: SupabaseClient,
  input: {
    oura_workout_id: string;
    workout_id: string;
  },
): Promise<{ ok: true } | { ok: false; error: string; code: "conflict" | "fk" | "unknown" }> {
  const { error } = await sb.from("oura_workout_links").insert({
    oura_workout_id: input.oura_workout_id,
    workout_id: input.workout_id,
  });
  if (!error) return { ok: true };
  const msg = error.message ?? "insert failed";
  if (error.code === "23505") return { ok: false, error: "This Oura workout is already linked.", code: "conflict" };
  if (error.code === "23503") return { ok: false, error: "Workout not found.", code: "fk" };
  return { ok: false, error: msg, code: "unknown" };
}

export async function deleteOuraWorkoutLink(
  sb: SupabaseClient,
  oura_workout_id: string,
): Promise<boolean> {
  const { data, error } = await sb
    .from("oura_workout_links")
    .delete()
    .eq("oura_workout_id", oura_workout_id)
    .select("oura_workout_id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
