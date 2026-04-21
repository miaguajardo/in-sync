import { NextResponse } from "next/server";
import { requireOuraConnectedOr403 } from "@/lib/auth/require-oura";
import { requireUserOr401 } from "@/lib/auth/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { parseWorkoutWriteBody } from "@/lib/workouts/parse-body";
import { createWorkout, listWorkouts } from "@/lib/workouts/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "server_misconfigured",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 503 },
    );
  }
  const auth = await requireUserOr401();
  if (!auth.ok) return auth.response;
  const oura = await requireOuraConnectedOr403(auth.user, auth.supabase);
  if (!oura.ok) return oura.response;

  const url = new URL(request.url);
  const start_date = url.searchParams.get("start_date") ?? undefined;
  const end_date = url.searchParams.get("end_date") ?? undefined;
  const time_zone = url.searchParams.get("time_zone");
  if ((start_date && !end_date) || (!start_date && end_date)) {
    return NextResponse.json(
      { error: "bad_request", hint: "Provide both start_date and end_date (YYYY-MM-DD) or omit both." },
      { status: 400 },
    );
  }
  if (start_date && end_date) {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(start_date) || !re.test(end_date)) {
      return NextResponse.json(
        { error: "bad_request", hint: "start_date and end_date must be YYYY-MM-DD." },
        { status: 400 },
      );
    }
  }
  try {
    const workouts = await listWorkouts(
      auth.supabase,
      start_date && end_date ? { start_date, end_date, time_zone } : {},
    );
    return NextResponse.json({ workouts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "server_misconfigured",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 503 },
    );
  }
  const auth = await requireUserOr401();
  if (!auth.ok) return auth.response;
  const oura = await requireOuraConnectedOr403(auth.user, auth.supabase);
  if (!oura.ok) return oura.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request", hint: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = parseWorkoutWriteBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "bad_request", hint: parsed.error }, { status: 400 });
  }
  try {
    const created = await createWorkout(auth.supabase, auth.user.id, parsed.value);
    if (!created.ok) {
      return NextResponse.json({ error: "bad_request", hint: created.error }, { status: 400 });
    }
    return NextResponse.json({ workout: created.workout }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}
