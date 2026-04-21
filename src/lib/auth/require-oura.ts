import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isOuraConnectedForUser } from "@/lib/oura/token-store";

/**
 * After requireUser: blocks API access until Oura tokens exist for this user.
 */
export async function requireOuraConnectedOr403(
  user: User,
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const connected = await isOuraConnectedForUser(supabase, user.id);
  if (!connected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "oura_required",
          hint: "Connect Oura under /onboarding before using this API.",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}
