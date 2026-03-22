import Link from "next/link";
import { isOuraConnected } from "@/lib/oura/token-store";
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
  const connected = await isOuraConnected();

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
          ouraConnected={sp.oura_connected}
          ouraError={sp.oura_error}
          ouraErrorDescription={sp.oura_error_description}
        />

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
