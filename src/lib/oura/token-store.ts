import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredOuraTokens = {
  access_token: string;
  refresh_token: string;
  /** Epoch ms when access_token is no longer valid */
  expires_at_ms: number;
  scope?: string;
  updated_at: string;
};

function rowToStored(row: Record<string, unknown>): StoredOuraTokens {
  return {
    access_token: row.access_token as string,
    refresh_token: (row.refresh_token as string | null) ?? "",
    expires_at_ms: Number(row.expires_at_ms),
    scope: (row.scope as string | null) ?? undefined,
    updated_at: row.updated_at as string,
  };
}

export async function readOuraTokensForUser(
  sb: SupabaseClient,
  userId: string,
): Promise<StoredOuraTokens | null> {
  const { data, error } = await sb
    .from("oura_oauth_tokens")
    .select("access_token, refresh_token, expires_at_ms, scope, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToStored(data as Record<string, unknown>);
}

export async function writeOuraTokensForUser(
  sb: SupabaseClient,
  userId: string,
  data: StoredOuraTokens,
): Promise<void> {
  const { error } = await sb.from("oura_oauth_tokens").upsert(
    {
      user_id: userId,
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_at_ms: data.expires_at_ms,
      scope: data.scope ?? null,
      updated_at: data.updated_at,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** True if stored tokens might still be usable (refresh or unexpired access). */
export async function isOuraConnectedForUser(
  sb: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const s = await readOuraTokensForUser(sb, userId);
  if (!s) return false;
  if (s.refresh_token) return true;
  return Date.now() < s.expires_at_ms;
}
