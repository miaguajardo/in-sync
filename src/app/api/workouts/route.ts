import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { parseWorkoutWriteBody } from "@/lib/workouts/parse-body";
import { createWorkout, listWorkouts } from "@/lib/workouts/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "server_misconfigured", hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const start_date = url.searchParams.get("start_date") ?? undefined;
  const end_date = url.searchParams.get("end_date") ?? undefined;
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
      start_date && end_date ? { start_date, end_date } : {},
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
      { error: "server_misconfigured", hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }
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
    const created = await createWorkout(parsed.value);
    if (!created.ok) {
      return NextResponse.json({ error: "bad_request", hint: created.error }, { status: 400 });
    }
    return NextResponse.json({ workout: created.workout }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}
