import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/onboarding/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isOuraConnectedForUser } from "@/lib/oura/token-store";

type SearchParams = {
  next?: string;
  oura_connected?: string;
  oura_error?: string;
  oura_error_description?: string;
};

function messageForOuraError(code: string): string {
  switch (code) {
    case "access_denied":
      return "Oura connection was cancelled.";
    case "state_mismatch":
      return "Security check failed. Try connecting again from this page.";
    case "session_mismatch":
      return "Use the same browser session when you return from Oura. Sign in again if needed.";
    case "token_exchange_failed":
      return "Could not complete sign-in with Oura. Check server configuration and try again.";
    case "server_misconfigured":
      return "App configuration is incomplete (Oura redirect URI or secrets).";
    default:
      return "Something went wrong connecting to Oura.";
  }
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16 sm:px-10">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Set up Supabase</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code className="text-xs">.env.local</code>, then reload.
        </p>
      </div>
    );
  }

  const sb = await createSupabaseServerClient();
  const connected = await isOuraConnectedForUser(sb, user.id);
  const nextDest = safeNextPath(sp.next);

  if (connected) {
    redirect(nextDest);
  }

  const authorizeHref = `/api/oura/authorize?next=${encodeURIComponent(nextDest)}`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-10 px-6 py-16 sm:px-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Step 2 of 2
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Connect Oura</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          You&apos;re signed in as <span className="font-medium text-zinc-800 dark:text-zinc-200">{user.email}</span>.
          Link your ring so we can read workouts from Oura and match them to sessions you log here.
        </p>
      </div>

      <ol className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
        <li className="flex gap-3">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
            aria-hidden
          >
            1
          </span>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Google account</p>
            <p className="text-zinc-600 dark:text-zinc-400">Done — you&apos;re authenticated.</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
            aria-hidden
          >
            2
          </span>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Oura ring</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              You&apos;ll leave this site briefly to approve access on Oura&apos;s site.
            </p>
          </div>
        </li>
      </ol>

      {sp.oura_error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">
          <p className="font-medium">{messageForOuraError(sp.oura_error)}</p>
          {sp.oura_error_description && (
            <p className="mt-1 text-xs opacity-90">{sp.oura_error_description}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={authorizeHref}
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Connect Oura
        </a>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Wrong Google account?{" "}
        <Link href="/" className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300">
          Home
        </Link>{" "}
        and use Sign out in the header.
      </p>
    </div>
  );
}
