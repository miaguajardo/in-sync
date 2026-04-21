import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedServiceRole: SupabaseClient | null = null;

export type SupabasePublicEnv = { url: string; anonKey: string };

/** URL + anon key for browser and user-scoped server clients (RLS). */
export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function readServiceRoleEnv(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

/** Server-only Supabase client using the service role key (bypasses RLS). Prefer user-scoped clients for app data. */
export function getSupabaseServiceRole(): SupabaseClient {
  const env = readServiceRoleEnv();
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cachedServiceRole) {
    cachedServiceRole = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedServiceRole;
}

/** True when public URL + anon key are set (required for auth and RLS-backed data access). */
export function isSupabaseConfigured(): boolean {
  return readSupabasePublicEnv() !== null;
}
