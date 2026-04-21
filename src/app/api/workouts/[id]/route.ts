import { NextResponse } from "next/server";
import { requireOuraConnectedOr403 } from "@/lib/auth/require-oura";
import { requireUserOr401 } from "@/lib/auth/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { parseWorkoutWriteBody } from "@/lib/workouts/parse-body";
import { deleteWorkout, getWorkoutById, updateWorkout } from "@/lib/workouts/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  try {
    const workout = await getWorkoutById(auth.supabase, id);
    if (!workout) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ workout });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
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
    const updated = await updateWorkout(auth.supabase, id, parsed.value);
    if (updated.kind === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (updated.kind === "invalid") {
      return NextResponse.json({ error: "bad_request", hint: updated.error }, { status: 400 });
    }
    return NextResponse.json({ workout: updated.workout });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  try {
    const deleted = await deleteWorkout(auth.supabase, id);
    if (!deleted) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: "database_error", hint: message }, { status: 500 });
  }
}
