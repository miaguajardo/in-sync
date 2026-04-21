import Link from "next/link";
import { Suspense } from "react";
import { LoginWithGoogle } from "./login-with-google";

export const metadata = {
  title: "Sign in",
};

type SearchParams = { next?: string; error?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-16 sm:px-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Use Google to access your workouts and Oura connection.
        </p>
      </div>
      {sp.error === "auth" && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          Sign-in did not complete. Try again.
        </div>
      )}
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <LoginWithGoogle />
      </Suspense>
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300">
          Back to home
        </Link>
      </p>
    </div>
  );
}
