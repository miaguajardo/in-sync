import { OURA_TOKEN_URL } from "./constants";
import type { StoredOuraTokens } from "./token-store";

type OuraTokenJson = {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
};

function requireOuraEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("OURA_CLIENT_ID and OURA_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<OuraTokenJson> {
  const { clientId, clientSecret } = requireOuraEnv();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  return postOuraToken(body);
}

/** Oura refresh tokens are single-use; always persist the new refresh_token. */
export async function refreshOuraTokens(
  refreshToken: string,
): Promise<OuraTokenJson> {
  const { clientId, clientSecret } = requireOuraEnv();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  return postOuraToken(body);
}

async function postOuraToken(body: URLSearchParams): Promise<OuraTokenJson> {
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Oura token endpoint ${res.status}: ${text}`);
  }
  return JSON.parse(text) as OuraTokenJson;
}

export function tokenResponseToStored(
  json: OuraTokenJson,
  scope?: string | null,
): StoredOuraTokens {
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at_ms: Date.now() + json.expires_in * 1000,
    scope: scope ?? undefined,
    updated_at: new Date().toISOString(),
  };
}
