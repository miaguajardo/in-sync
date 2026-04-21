import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { readSupabasePublicEnv } from "@/lib/supabase/server";

/** Current user from the session JWT (server-only). */
export async function getSessionUser(): Promise<User | null> {
  if (!readSupabasePublicEnv()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
