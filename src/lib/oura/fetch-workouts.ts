import { getValidOuraAccessToken } from "./access-token";
import { fetchOuraUserCollection } from "./v2-client";
import {
  parseOuraWorkoutCollectionPayload,
  type OuraWorkoutSummary,
} from "./workout-models";

export async function fetchOuraWorkoutsForDateRange(input: {
  start_date: string;
  end_date: string;
}): Promise<
  | { ok: true; workouts: OuraWorkoutSummary[]; status: number }
  | { ok: false; kind: "not_connected" }
  | { ok: false; kind: "upstream"; status: number; raw?: string }
> {
  const accessToken = await getValidOuraAccessToken();
  if (!accessToken) {
    return { ok: false, kind: "not_connected" };
  }
  const q = new URLSearchParams();
  q.set("start_date", input.start_date);
  q.set("end_date", input.end_date);
  const r = await fetchOuraUserCollection(accessToken, "workout", q);
  if (r.status < 200 || r.status >= 300) {
    return {
      ok: false,
      kind: "upstream",
      status: r.status,
      ...(r.raw !== undefined ? { raw: r.raw } : {}),
    };
  }
  const workouts = parseOuraWorkoutCollectionPayload(r.data);
  return { ok: true, workouts, status: r.status };
}

export function ouraWorkoutIds(
  workouts: OuraWorkoutSummary[],
): ReadonlySet<string> {
  return new Set(workouts.map((w) => w.id));
}
