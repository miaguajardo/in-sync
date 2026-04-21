import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { readSupabasePublicEnv } from "@/lib/supabase/server";

export type AuthedContext = { user: User; supabase: SupabaseClient };

export async function requireUserOr401(): Promise<
  { ok: true } & AuthedContext | { ok: false; response: NextResponse }
> {
  if (!readSupabasePublicEnv()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "server_misconfigured",
          hint: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 503 },
      ),
    };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthenticated", hint: "Sign in to use this API." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, user, supabase };
}
