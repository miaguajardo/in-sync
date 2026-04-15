export type WorkoutBlockType = "single" | "superset" | "circuit";

export type WorkoutSetInput = {
  position: number;
  reps: number;
  weight_kg?: number | null;
  notes?: string | null;
};

export type WorkoutExerciseInput = {
  position: number;
  name: string;
  sets: WorkoutSetInput[];
};

export type WorkoutBlockInput = {
  position: number;
  type: WorkoutBlockType;
  name?: string | null;
  rounds?: number | null;
  rest_seconds?: number | null;
  exercises: WorkoutExerciseInput[];
};

export type WorkoutWriteInput = {
  title: string;
  started_at: string;
  notes?: string | null;
  blocks: WorkoutBlockInput[];
};

export type WorkoutSetRow = {
  id: string;
  workout_exercise_id: string;
  position: number;
  reps: number;
  weight_kg: number | null;
  notes: string | null;
};

export type WorkoutExerciseRow = {
  id: string;
  workout_block_id: string;
  position: number;
  name: string;
  sets: WorkoutSetRow[];
};

export type WorkoutBlockRow = {
  id: string;
  workout_id: string;
  position: number;
  type: WorkoutBlockType;
  name: string | null;
  rounds: number | null;
  rest_seconds: number | null;
  exercises: WorkoutExerciseRow[];
};

export type WorkoutRow = {
  id: string;
  title: string;
  started_at: string;
  notes: string | null;
  created_at: string;
};

export type WorkoutWithChildren = WorkoutRow & {
  blocks: WorkoutBlockRow[];
};

export type OuraWorkoutLinkRow = {
  oura_workout_id: string;
  workout_id: string;
  created_at: string;
};

/** Total exercises across all blocks (for list summaries). */
export function totalExerciseCount(w: Pick<WorkoutWithChildren, "blocks">): number {
  return w.blocks.reduce((n, b) => n + b.exercises.length, 0);
}
