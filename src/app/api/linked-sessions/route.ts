import { NextResponse } from "next/server";
import { fetchOuraWorkoutsForDateRange } from "@/lib/oura/fetch-workouts";
import type { OuraWorkoutSummary } from "@/lib/oura/workout-models";
import { resolveSnapshotRange } from "@/lib/oura/snapshot";
import { buildLinkedSessionPairs } from "@/lib/linked-sessions/pairs";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getWorkoutById, listOuraWorkoutLinks } from "@/lib/workouts/service";
import type { WorkoutWithChildren } from "@/lib/workouts/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "server_misconfigured", hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const range = resolveSnapshotRange(url.searchParams);
  if (!range.ok) {
    return NextResponse.json({ error: "bad_request", hint: range.error }, { status: 400 });
  }
  const time_zone = url.searchParams.get("time_zone");

  try {
    const links = await listOuraWorkoutLinks({
      start_date: range.start_date,
      end_date: range.end_date,
      time_zone,
    });

    const workoutIds = [...new Set(links.map((l) => l.workout_id))];
    const gymById = new Map<string, WorkoutWithChildren | null>();
    await Promise.all(
      workoutIds.map(async (id) => {
        gymById.set(id, await getWorkoutById(id));
      }),
    );

    const ouraById = new Map<string, OuraWorkoutSummary>();
    let oura_status: "ok" | "not_connected" | "upstream" = "ok";
    let oura_error: string | undefined;

    const ouraOut = await fetchOuraWorkoutsForDateRange({
      start_date: range.start_date,
      end_date: range.end_date,
    });

    if (ouraOut.ok) {
      for (const w of ouraOut.workouts) {
        ouraById.set(w.id, w);
      }
    } else if (ouraOut.kind === "not_connected") {
      oura_status = "not_connected";
    } else {
      oura_status = "upstream";
      oura_error = `Oura returned HTTP ${ouraOut.status}.`;
    }

    const pairs = buildLinkedSessionPairs(links, ouraById, gymById);

    return NextResponse.json({
      start_date: range.start_date,
      end_date: range.end_date,
      oura_status,
      ...(oura_error !== undefined ? { oura_error } : {}),
      pairs,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "server_error", hint: message }, { status: 500 });
  }
}
