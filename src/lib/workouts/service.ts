import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type {
  OuraWorkoutLinkRow,
  WorkoutExerciseInput,
  WorkoutWithChildren,
  WorkoutWriteInput,
} from "./types";

function isoDayBounds(start_date: string, end_date: string): {
  start: string;
  end: string;
} {
  return {
    start: `${start_date}T00:00:00.000Z`,
    end: `${end_date}T23:59:59.999Z`,
  };
}

function assertWorkoutInput(input: WorkoutWriteInput): string | null {
  if (!input.title.trim()) return "title is required.";
  if (!input.started_at) return "started_at is required.";
  const d = Date.parse(input.started_at);
  if (!Number.isFinite(d)) return "started_at must be a valid ISO datetime.";
  if (!input.exercises.length) return "At least one exercise is required.";
  for (const ex of input.exercises) {
    if (!ex.name.trim()) return "Each exercise needs a name.";
    if (!ex.sets.length) return "Each exercise needs at least one set.";
    for (const s of ex.sets) {
      if (!Number.isFinite(s.reps) || s.reps < 0) return "Set reps must be a non-negative number.";
    }
  }
  return null;
}

export async function listWorkouts(params: {
  start_date?: string;
  end_date?: string;
}): Promise<WorkoutWithChildren[]> {
  const sb = getSupabaseServiceRole();
  let q = sb.from("workouts").select("*").order("started_at", { ascending: false });
  if (params.start_date && params.end_date) {
    const { start, end } = isoDayBounds(params.start_date, params.end_date);
    q = q.gte("started_at", start).lte("started_at", end);
  }
  const { data: workouts, error } = await q;
  if (error) throw error;
  if (!workouts?.length) return [];
  const ids = workouts.map((w) => w.id as string);
  const { data: exercises, error: eErr } = await sb
    .from("workout_exercises")
    .select("*")
    .in("workout_id", ids)
    .order("position", { ascending: true });
  if (eErr) throw eErr;
  const exerciseIds = (exercises ?? []).map((e) => e.id as string);
  const setsByExercise = new Map<string, WorkoutWithChildren["exercises"][0]["sets"]>();
  if (exerciseIds.length) {
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
        weight_kg: row.weight_kg as number | null,
        notes: row.notes as string | null,
      });
      setsByExercise.set(exId, list);
    }
  }
  const exercisesByWorkout = new Map<string, WorkoutWithChildren["exercises"]>();
  for (const row of exercises ?? []) {
    const wid = row.workout_id as string;
    const exId = row.id as string;
    const list = exercisesByWorkout.get(wid) ?? [];
    list.push({
      id: exId,
      workout_id: wid,
      position: row.position as number,
      name: row.name as string,
      sets: setsByExercise.get(exId) ?? [],
    });
    exercisesByWorkout.set(wid, list);
  }
  return (workouts as WorkoutWithChildren[]).map((w) => ({
    ...(w as unknown as WorkoutWithChildren),
    exercises: exercisesByWorkout.get(w.id as string) ?? [],
  }));
}

export async function getWorkoutById(id: string): Promise<WorkoutWithChildren | null> {
  const sb = getSupabaseServiceRole();
  const { data: w, error } = await sb.from("workouts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!w) return null;
  const { data: exercises, error: eErr } = await sb
    .from("workout_exercises")
    .select("*")
    .eq("workout_id", id)
    .order("position", { ascending: true });
  if (eErr) throw eErr;
  const exerciseRows = exercises ?? [];
  const exerciseIds = exerciseRows.map((e) => e.id as string);
  const setsByExercise = new Map<string, WorkoutWithChildren["exercises"][0]["sets"]>();
  if (exerciseIds.length) {
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
        weight_kg: row.weight_kg as number | null,
        notes: row.notes as string | null,
      });
      setsByExercise.set(exId, list);
    }
  }
  const exOut: WorkoutWithChildren["exercises"] = exerciseRows.map((row) => {
    const exId = row.id as string;
    return {
      id: exId,
      workout_id: row.workout_id as string,
      position: row.position as number,
      name: row.name as string,
      sets: setsByExercise.get(exId) ?? [],
    };
  });
  return {
    id: w.id as string,
    title: w.title as string,
    started_at: w.started_at as string,
    notes: w.notes as string | null,
    created_at: w.created_at as string,
    exercises: exOut,
  };
}

async function insertExercisesAndSets(
  workoutId: string,
  exercises: WorkoutExerciseInput[],
): Promise<void> {
  const sb = getSupabaseServiceRole();
  const exerciseRows = exercises.map((e) => ({
    workout_id: workoutId,
    position: e.position,
    name: e.name.trim(),
  }));
  const { data: insertedEx, error: insExErr } = await sb
    .from("workout_exercises")
    .insert(exerciseRows)
    .select("id, position");
  if (insExErr) throw insExErr;
  const byPosition = new Map<number, string>();
  const sortedEx = [...(insertedEx ?? [])].sort(
    (a, b) => (a.position as number) - (b.position as number),
  );
  for (const row of sortedEx) {
    byPosition.set(row.position as number, row.id as string);
  }
  const setRows: {
    workout_exercise_id: string;
    position: number;
    reps: number;
    weight_kg: number | null;
    notes: string | null;
  }[] = [];
  for (const ex of exercises) {
    const exId = byPosition.get(ex.position);
    if (!exId) throw new Error("Failed to resolve inserted exercise id.");
    for (const s of ex.sets) {
      setRows.push({
        workout_exercise_id: exId,
        position: s.position,
        reps: s.reps,
        weight_kg: s.weight_kg ?? null,
        notes: s.notes?.trim() ? s.notes.trim() : null,
      });
    }
  }
  if (setRows.length) {
    const { error: insSetErr } = await sb.from("workout_sets").insert(setRows);
    if (insSetErr) throw insSetErr;
  }
}

export async function createWorkout(
  input: WorkoutWriteInput,
): Promise<{ ok: true; workout: WorkoutWithChildren } | { ok: false; error: string }> {
  const err = assertWorkoutInput(input);
  if (err) return { ok: false, error: err };
  const sb = getSupabaseServiceRole();
  const { data: w, error } = await sb
    .from("workouts")
    .insert({
      title: input.title.trim(),
      started_at: input.started_at,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select("*")
    .single();
  if (error) throw error;
  const workoutId = w.id as string;
  try {
    await insertExercisesAndSets(workoutId, input.exercises);
  } catch (e) {
    await sb.from("workouts").delete().eq("id", workoutId);
    throw e;
  }
  const full = await getWorkoutById(workoutId);
  if (!full) throw new Error("Workout missing after insert.");
  return { ok: true, workout: full };
}

export async function updateWorkout(
  id: string,
  input: WorkoutWriteInput,
): Promise<
  | { kind: "ok"; workout: WorkoutWithChildren }
  | { kind: "not_found" }
  | { kind: "invalid"; error: string }
> {
  const err = assertWorkoutInput(input);
  if (err) return { kind: "invalid", error: err };
  const sb = getSupabaseServiceRole();
  const existing = await getWorkoutById(id);
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
  const { error: delErr } = await sb.from("workout_exercises").delete().eq("workout_id", id);
  if (delErr) throw delErr;
  await insertExercisesAndSets(id, input.exercises);
  const full = await getWorkoutById(id);
  if (!full) throw new Error("Workout missing after update.");
  return { kind: "ok", workout: full };
}

export async function deleteWorkout(id: string): Promise<boolean> {
  const sb = getSupabaseServiceRole();
  const { data, error } = await sb.from("workouts").delete().eq("id", id).select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export type OuraLinkWithWorkout = OuraWorkoutLinkRow & {
  workout: { title: string; started_at: string };
};

export async function listOuraWorkoutLinks(params: {
  start_date: string;
  end_date: string;
}): Promise<OuraLinkWithWorkout[]> {
  const sb = getSupabaseServiceRole();
  const { start, end } = isoDayBounds(params.start_date, params.end_date);
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

export async function insertOuraWorkoutLink(input: {
  oura_workout_id: string;
  workout_id: string;
}): Promise<{ ok: true } | { ok: false; error: string; code: "conflict" | "fk" | "unknown" }> {
  const sb = getSupabaseServiceRole();
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

export async function deleteOuraWorkoutLink(oura_workout_id: string): Promise<boolean> {
  const sb = getSupabaseServiceRole();
  const { data, error } = await sb
    .from("oura_workout_links")
    .delete()
    .eq("oura_workout_id", oura_workout_id)
    .select("oura_workout_id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
