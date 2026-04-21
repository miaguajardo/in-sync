"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginWithGoogle() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const next = searchParams.get("next") ?? "/workouts";
      const safeNext =
        next.startsWith("/") && !next.startsWith("//") ? next : "/workouts";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setMessage(error.message);
        setPending(false);
      }
    } catch {
      setMessage("Sign-in failed. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
          {message}
        </div>
      )}
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
    </div>
  );
}
