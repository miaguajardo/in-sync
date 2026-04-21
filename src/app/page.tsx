import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { isOuraConnectedForUser } from "@/lib/oura/token-store";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { OuraConnectPanel } from "./oura-connect-panel";

type SearchParams = {
  oura_connected?: string;
  oura_error?: string;
  oura_error_description?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getSessionUser();
  let connected = false;
  if (user && isSupabaseConfigured()) {
    const sb = await createSupabaseServerClient();
    connected = await isOuraConnectedForUser(sb, user.id);
  }

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16 sm:px-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            In Sync
          </h1>
          <p className="mt-2 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Connect Oura to align ring stats with your logged workouts.
          </p>
        </div>

        <OuraConnectPanel
          connected={connected}
          canConnectOura={!!user}
          ouraConnected={sp.oura_connected}
          ouraError={sp.oura_error}
          ouraErrorDescription={sp.oura_error_description}
        />

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">V1 pages</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Log structured workouts, browse Oura-detected sessions, then attach them on the link page.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <Link className="font-medium underline-offset-4 hover:underline" href="/workouts">
                Workouts
              </Link>{" "}
              — blocks (single, superset, circuit), sets, reps, optional weight (lb).
            </li>
            <li>
              <Link className="font-medium underline-offset-4 hover:underline" href="/oura">
                Oura hub
              </Link>{" "}
              — workouts from the ring (more data types soon).
            </li>
            <li>
              <Link className="font-medium underline-offset-4 hover:underline" href="/linked-sessions">
                Sessions
              </Link>{" "}
              — see linked Oura + gym workouts as cards.
            </li>
            <li>
              <Link className="font-medium underline-offset-4 hover:underline" href="/link">
                Link
              </Link>{" "}
              — connect an Oura workout to a logged session.
            </li>
          </ul>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Sign in with Google. Gym workouts and Oura tokens are stored per account in Supabase.
          </p>
        </section>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Legal:{" "}
          <Link
            href="/terms"
            className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            Terms
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            Privacy
          </Link>
        </p>
      </main>
    </div>
  );
}
