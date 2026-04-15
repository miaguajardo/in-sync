import type { OuraWorkoutSummary } from "@/lib/oura/workout-models";
import type { WorkoutWithChildren } from "@/lib/workouts/types";

export type LinkRowInput = {
  oura_workout_id: string;
  workout_id: string;
  created_at: string;
};

export type LinkedSessionPair = {
  oura_workout_id: string;
  workout_id: string;
  linked_at: string;
  session_at: string;
  oura: OuraWorkoutSummary | null;
  gym: WorkoutWithChildren | null;
};

function computeSessionAt(
  oura: OuraWorkoutSummary | null,
  gym: WorkoutWithChildren | null,
  linkedAt: string,
): string {
  const tOura = oura?.start_datetime ? Date.parse(oura.start_datetime) : NaN;
  const tGym = gym?.started_at ? Date.parse(gym.started_at) : NaN;
  const tLink = Date.parse(linkedAt);
  const candidates = [tOura, tGym, tLink].filter((t) => Number.isFinite(t)) as number[];
  if (!candidates.length) return new Date().toISOString();
  return new Date(Math.max(...candidates)).toISOString();
}

export function buildLinkedSessionPairs(
  links: LinkRowInput[],
  ouraById: Map<string, OuraWorkoutSummary>,
  gymById: Map<string, WorkoutWithChildren | null>,
): LinkedSessionPair[] {
  const pairs: LinkedSessionPair[] = links.map((link) => {
    const oura = ouraById.get(link.oura_workout_id) ?? null;
    const gym = gymById.get(link.workout_id) ?? null;
    return {
      oura_workout_id: link.oura_workout_id,
      workout_id: link.workout_id,
      linked_at: link.created_at,
      session_at: computeSessionAt(oura, gym, link.created_at),
      oura,
      gym,
    };
  });
  return pairs.sort((a, b) => Date.parse(b.session_at) - Date.parse(a.session_at));
}
