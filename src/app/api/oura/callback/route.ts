import { NextResponse } from "next/server";

/**
 * Oura OAuth redirect URI — register these exactly in the Oura developer app:
 * - Dev:  http://localhost:3000/api/oura/callback
 * - Prod: https://<your-domain>/api/oura/callback
 *
 * TODO: Exchange `code` for access/refresh tokens (same redirect_uri as authorization).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const description = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    const home = new URL("/", url.origin);
    home.searchParams.set("oura_error", error);
    if (description) home.searchParams.set("oura_error_description", description);
    return NextResponse.redirect(home);
  }

  if (!code) {
    return NextResponse.json(
      { error: "missing_code", hint: "Oura should redirect here with ?code=..." },
      { status: 400 },
    );
  }

  // Placeholder: validate `state` against the value you stored at authorize start,
  // then POST to Oura's token endpoint with code + client_secret (server-side only).
  void state;

  const home = new URL("/", url.origin);
  home.searchParams.set("oura_callback", "ok");
  return NextResponse.redirect(home);
}
