import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  tokenResponseToStored,
} from "@/lib/oura/oauth-client";
import {
  OURA_POST_NEXT_COOKIE,
  OURA_STATE_COOKIE,
  OURA_USER_COOKIE,
} from "@/lib/oura/constants";
import { safeNextPath } from "@/lib/onboarding/safe-next-path";
import { writeOuraTokensForUser } from "@/lib/oura/token-store";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

function redirectOnboarding(
  origin: string,
  query: Record<string, string | undefined>,
  nextPath: string,
  clearOuraCookies: boolean,
) {
  const u = new URL("/onboarding", origin);
  u.searchParams.set("next", safeNextPath(nextPath));
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) u.searchParams.set(k, v);
  }
  const res = NextResponse.redirect(u);
  if (clearOuraCookies) {
    res.cookies.delete(OURA_STATE_COOKIE);
    res.cookies.delete(OURA_USER_COOKIE);
    res.cookies.delete(OURA_POST_NEXT_COOKIE);
  }
  return res;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const error = url.searchParams.get("error");
  const description = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const scope = url.searchParams.get("scope");

  const jar = await cookies();
  const cookieState = jar.get(OURA_STATE_COOKIE)?.value ?? null;
  const cookieUserId = jar.get(OURA_USER_COOKIE)?.value ?? null;
  const cookieNext = jar.get(OURA_POST_NEXT_COOKIE)?.value ?? null;
  const nextPath = safeNextPath(cookieNext);

  const stateOk =
    cookieState !== null &&
    state !== null &&
    cookieState.length > 0 &&
    state.length > 0 &&
    cookieState === state;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userOk =
    user !== null &&
    cookieUserId !== null &&
    cookieUserId.length > 0 &&
    user.id === cookieUserId;

  if (!userOk) {
    return redirectOnboarding(origin, { oura_error: "session_mismatch" }, nextPath, true);
  }

  if (error) {
    if (!stateOk) {
      return redirectOnboarding(origin, { oura_error: "state_mismatch" }, nextPath, true);
    }
    const q: Record<string, string | undefined> = { oura_error: error };
    if (description) q.oura_error_description = description;
    return redirectOnboarding(origin, q, nextPath, true);
  }

  if (!code) {
    return NextResponse.json(
      { error: "missing_code", hint: "Oura should redirect here with ?code=..." },
      { status: 400 },
    );
  }

  if (!stateOk) {
    return redirectOnboarding(origin, { oura_error: "state_mismatch" }, nextPath, true);
  }

  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!redirectUri) {
    return redirectOnboarding(origin, { oura_error: "server_misconfigured" }, nextPath, true);
  }

  try {
    const json = await exchangeAuthorizationCode(code, redirectUri);
    const stored = tokenResponseToStored(json, scope);
    await writeOuraTokensForUser(supabase, user.id, stored);
  } catch {
    return redirectOnboarding(origin, { oura_error: "token_exchange_failed" }, nextPath, true);
  }

  const dest = new URL(nextPath, origin);
  const res = NextResponse.redirect(dest);
  res.cookies.delete(OURA_STATE_COOKIE);
  res.cookies.delete(OURA_USER_COOKIE);
  res.cookies.delete(OURA_POST_NEXT_COOKIE);
  return res;
}
