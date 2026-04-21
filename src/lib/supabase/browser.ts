import { createBrowserClient } from "@supabase/ssr";
import { readSupabasePublicEnv } from "./server";

export function createSupabaseBrowserClient() {
  const env = readSupabasePublicEnv();
  if (!env) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createBrowserClient(env.url, env.anonKey);
}
