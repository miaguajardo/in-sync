import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  DEFAULT_OURA_SCOPES,
  OURA_AUTHORIZE_URL,
  OURA_STATE_COOKIE,
} from "@/lib/oura/constants";

export const runtime = "nodejs";

export async function GET() {
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
  res.cookies.set(OURA_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
