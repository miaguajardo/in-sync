import { refreshOuraTokens, tokenResponseToStored } from "./oauth-client";
import { readOuraTokens, writeOuraTokens } from "./token-store";

const EXPIRY_BUFFER_MS = 60_000;

/**
 * Returns a non-expired access token, refreshing with the stored refresh token when needed.
 * Oura invalidates the previous refresh token after each refresh — the store is always updated.
 */
export async function getValidOuraAccessToken(): Promise<string | null> {
  const stored = await readOuraTokens();
  if (!stored) return null;

  if (Date.now() < stored.expires_at_ms - EXPIRY_BUFFER_MS) {
    return stored.access_token;
  }

  if (!stored.refresh_token) return null;

  try {
    const json = await refreshOuraTokens(stored.refresh_token);
    const next = tokenResponseToStored(json, stored.scope);
    await writeOuraTokens(next);
    return next.access_token;
  } catch {
    return null;
  }
}
