import { NextResponse } from "next/server";
import { fetchOuraWorkoutsForDateRange } from "@/lib/oura/fetch-workouts";
import { resolveSnapshotRange } from "@/lib/oura/snapshot";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = resolveSnapshotRange(url.searchParams);
  if (!range.ok) {
    return NextResponse.json({ error: "bad_request", hint: range.error }, { status: 400 });
  }
  const out = await fetchOuraWorkoutsForDateRange({
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
