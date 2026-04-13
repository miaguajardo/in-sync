import { NextResponse } from "next/server";
import { buildOuraSnapshot } from "@/lib/oura/snapshot";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const out = await buildOuraSnapshot(url.searchParams);

  if (out.status === 401) {
    return NextResponse.json(
      { error: "not_connected", hint: "Complete OAuth via /api/oura/authorize" },
      { status: 401 },
    );
  }
  if (out.status === 400) {
    return NextResponse.json({ error: "bad_request", hint: out.error }, { status: 400 });
  }
  return NextResponse.json(out.body);
}
