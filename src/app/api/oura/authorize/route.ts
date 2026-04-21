import crypto from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { safeNextPath } from "@/lib/onboarding/safe-next-path";
import {
  DEFAULT_OURA_SCOPES,
  OURA_AUTHORIZE_URL,
  OURA_POST_NEXT_COOKIE,
  OURA_STATE_COOKIE,
  OURA_USER_COOKIE,
} from "@/lib/oura/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);
  const nextDest = safeNextPath(url.searchParams.get("next"));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL("/login", origin);
    login.searchParams.set("next", "/onboarding");
    return NextResponse.redirect(login);
  }

  const clientId = process.env.OURA_CLIENT_ID;
  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "server_misconfigured", hint: "Set OURA_CLIENT_ID and OURA_REDIRECT_URI" },
      { status: 500 },
    );
  }

  const state = crypto.randomBytes(32).toString("hex");
  const scope =
    process.env.OURA_SCOPES?.trim().replace(/\s+/g, " ") ?? DEFAULT_OURA_SCOPES;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  const authUrl = `${OURA_AUTHORIZE_URL}?${params.toString()}`;
  const res = NextResponse.redirect(authUrl);
  const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  res.cookies.set(OURA_STATE_COOKIE, state, cookieBase);
  res.cookies.set(OURA_USER_COOKIE, user.id, cookieBase);
  res.cookies.set(OURA_POST_NEXT_COOKIE, nextDest, cookieBase);
  return res;
}
