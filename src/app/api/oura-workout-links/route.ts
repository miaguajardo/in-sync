import { NextResponse } from "next/server";
import { requireOuraConnectedOr403 } from "@/lib/auth/require-oura";
import { requireUserOr401 } from "@/lib/auth/require-user";
import { fetchOuraWorkoutsForDateRange, ouraWorkoutIds } from "@/lib/oura/fetch-workouts";
import { resolveSnapshotRange } from "@/lib/oura/snapshot";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  deleteOuraWorkoutLink,
  insertOuraWorkoutLink,
  listOuraWorkoutLinks,
} from "@/lib/workouts/service";

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
  const start_date = url.searchParams.get("start_date");
  const end_date = url.searchParams.get("end_date");
  const time_zone = url.searchParams.get("time_zone");
  if (!start_date || !end_date) {
    return NextResponse.json(
      { error: "bad_request", hint: "Provide start_date and end_date (YYYY-MM-DD)." },
      { status: 400 },
    );
  }
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(start_date) || !re.test(end_date)) {
    return NextResponse.json(
      { error: "bad_request", hint: "start_date and end_date must be YYYY-MM-DD." },
      { status: 400 },
    );
  }
  try {
    const links = await listOuraWorkoutLinks(auth.supabase, { start_date, end_date, time_zone });
    return NextResponse.json({ links });
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
  const ouraGate = await requireOuraConnectedOr403(auth.user, auth.supabase);
  if (!ouraGate.ok) return ouraGate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request", hint: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "bad_request", hint: "JSON object required." }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const oura_workout_id = typeof o.oura_workout_id === "string" ? o.oura_workout_id.trim() : "";
  const workout_id = typeof o.workout_id === "string" ? o.workout_id.trim() : "";
  const start_date = typeof o.start_date === "string" ? o.start_date : "";
  const end_date = typeof o.end_date === "string" ? o.end_date : "";
  if (!oura_workout_id || !workout_id) {
    return NextResponse.json(
      { error: "bad_request", hint: "oura_workout_id and workout_id are required." },
      { status: 400 },
    );
  }
  const range = resolveSnapshotRange(
    new URLSearchParams({ start_date, end_date }),
  );
  if (!range.ok) {
    return NextResponse.json({ error: "bad_request", hint: range.error }, { status: 400 });
  }
  const ouraFetch = await fetchOuraWorkoutsForDateRange(auth.supabase, auth.user.id, {
    start_date: range.start_date,
    end_date: range.end_date,
  });
  if (!ouraFetch.ok) {
    if (ouraFetch.kind === "not_connected") {
      return NextResponse.json(
        { error: "not_connected", hint: "Complete OAuth via /api/oura/authorize" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error: "oura_upstream",
        status: ouraFetch.status,
      },
      { status: 502 },
    );
  }
  if (!ouraWorkoutIds(ouraFetch.workouts).has(oura_workout_id)) {
    return NextResponse.json(
      {
        error: "oura_workout_not_in_range",
        hint: "oura_workout_id was not returned by Oura for the given start_date/end_date.",
      },
      { status: 400 },
    );
  }
  try {
    const ins = await insertOuraWorkoutLink(auth.supabase, { oura_workout_id, workout_id });
    if (!ins.ok) {
      const status = ins.code === "conflict" ? 409 : ins.code === "fk" ? 400 : 500;
      return NextResponse.json({ error: ins.code, hint: ins.error }, { status });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
  const oura_workout_id = url.searchParams.get("oura_workout_id")?.trim() ?? "";
  if (!oura_workout_id) {
    return NextResponse.json(
      { error: "bad_request", hint: "Query param oura_workout_id is required." },
      { status: 400 },
    );
  }
  try {
    const deleted = await deleteOuraWorkoutLink(auth.supabase, oura_workout_id);
    if (!deleted) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}
