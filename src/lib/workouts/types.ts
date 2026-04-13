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

export type WorkoutWriteInput = {
  title: string;
  started_at: string;
  notes?: string | null;
  exercises: WorkoutExerciseInput[];
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
  workout_id: string;
  position: number;
  name: string;
  sets: WorkoutSetRow[];
};

export type WorkoutRow = {
  id: string;
  title: string;
  started_at: string;
  notes: string | null;
  created_at: string;
};

export type WorkoutWithChildren = WorkoutRow & {
  exercises: WorkoutExerciseRow[];
};

export type OuraWorkoutLinkRow = {
  oura_workout_id: string;
  workout_id: string;
  created_at: string;
};
