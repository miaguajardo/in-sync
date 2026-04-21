import { NextResponse } from "next/server";
import { requireOuraConnectedOr403 } from "@/lib/auth/require-oura";
import { requireUserOr401 } from "@/lib/auth/require-user";
import { fetchOuraWorkoutsForDateRange } from "@/lib/oura/fetch-workouts";
import { resolveSnapshotRange } from "@/lib/oura/snapshot";
import { isSupabaseConfigured } from "@/lib/supabase/server";

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
  const range = resolveSnapshotRange(url.searchParams);
  if (!range.ok) {
    return NextResponse.json({ error: "bad_request", hint: range.error }, { status: 400 });
  }
  const out = await fetchOuraWorkoutsForDateRange(auth.supabase, auth.user.id, {
    start_date: range.start_date,
    end_date: range.end_date,
  });
  if (!out.ok) {
    if (out.kind === "not_connected") {
      return NextResponse.json(
        { error: "not_connected", hint: "Complete OAuth via /api/oura/authorize" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      {
        error: "oura_upstream",
        status: out.status,
        ...(out.raw !== undefined ? { raw: out.raw } : {}),
      },
      { status: 502 },
    );
  }
  return NextResponse.json({
    start_date: range.start_date,
    end_date: range.end_date,
    workouts: out.workouts,
  });
}
