import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  tokenResponseToStored,
} from "@/lib/oura/oauth-client";
import { OURA_STATE_COOKIE } from "@/lib/oura/constants";
import { writeOuraTokens } from "@/lib/oura/token-store";

export const runtime = "nodejs";

function redirectHome(
  origin: string,
  query: Record<string, string | undefined>,
  clearStateCookie: boolean,
) {
  const home = new URL("/", origin);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) home.searchParams.set(k, v);
  }
  const res = NextResponse.redirect(home);
  if (clearStateCookie) {
    res.cookies.delete(OURA_STATE_COOKIE);
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

  const stateOk =
    cookieState !== null &&
    state !== null &&
    cookieState.length > 0 &&
    state.length > 0 &&
    cookieState === state;

  if (error) {
    if (!stateOk) {
      return redirectHome(
        origin,
        { oura_error: "state_mismatch" },
        true,
      );
    }
    const q: Record<string, string | undefined> = { oura_error: error };
    if (description) q.oura_error_description = description;
    return redirectHome(origin, q, true);
  }

  if (!code) {
    return NextResponse.json(
      { error: "missing_code", hint: "Oura should redirect here with ?code=..." },
      { status: 400 },
    );
  }

  if (!stateOk) {
    return redirectHome(origin, { oura_error: "state_mismatch" }, true);
  }

  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!redirectUri) {
    return redirectHome(
      origin,
      { oura_error: "server_misconfigured" },
      true,
    );
  }

  try {
    const json = await exchangeAuthorizationCode(code, redirectUri);
    const stored = tokenResponseToStored(json, scope);
    await writeOuraTokens(stored);
  } catch {
    return redirectHome(origin, { oura_error: "token_exchange_failed" }, true);
  }

  return redirectHome(origin, { oura_connected: "1" }, true);
}
