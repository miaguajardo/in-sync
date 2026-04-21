import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/onboarding/safe-next-path";
import { readSupabasePublicEnv } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const env = readSupabasePublicEnv();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  if (!env || !code) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const intended = safeNextPath(nextParam);
  const onboarding = new URL("/onboarding", origin);
  onboarding.searchParams.set("next", intended);
  return NextResponse.redirect(onboarding);
}
