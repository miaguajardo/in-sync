import { NextResponse } from "next/server";
import { requireOuraConnectedOr403 } from "@/lib/auth/require-oura";
import { requireUserOr401 } from "@/lib/auth/require-user";
import { buildOuraSnapshot } from "@/lib/oura/snapshot";
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
  const out = await buildOuraSnapshot(auth.supabase, auth.user.id, url.searchParams);

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
