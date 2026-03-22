import Link from "next/link";

type Props = {
  connected: boolean;
  ouraConnected?: string;
  ouraError?: string;
  ouraErrorDescription?: string;
};

function messageForError(code: string): string {
  switch (code) {
    case "access_denied":
      return "Oura connection was cancelled.";
    case "state_mismatch":
      return "Security check failed. Try connecting again from this app.";
    case "token_exchange_failed":
      return "Could not complete sign-in with Oura. Check server logs and credentials.";
    case "server_misconfigured":
      return "App configuration is incomplete (missing redirect URI or secrets).";
    default:
      return "Something went wrong connecting to Oura.";
  }
}

export function OuraConnectPanel({
  connected,
  ouraConnected,
  ouraError,
  ouraErrorDescription,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Oura
      </h2>
      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Uses OAuth (server-side flow). Scopes default to daily summaries and
        workouts — adjust with{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
          OURA_SCOPES
        </code>{" "}
        in{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
          .env.local
        </code>
        .
      </p>

      <div className="mt-4 space-y-3">
        {ouraConnected === "1" && (
          <p
            className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            role="status"
          >
            Oura account linked. Tokens are stored on the server (see{" "}
            <code className="text-xs">.data/oura-tokens.json</code> locally).
          </p>
        )}

        {ouraError && (
          <div
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            <p className="font-medium">{messageForError(ouraError)}</p>
            {ouraErrorDescription && (
              <p className="mt-1 text-xs opacity-90">{ouraErrorDescription}</p>
            )}
            <p className="mt-1 text-xs opacity-80">Code: {ouraError}</p>
          </div>
        )}

        {connected ? (
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Status: connected (stored tokens present).
          </p>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Status: not connected.
          </p>
        )}
      </div>

      <div className="mt-6">
        <a
          href="/api/oura/authorize"
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {connected ? "Reconnect Oura" : "Connect Oura"}
        </a>
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
        Register{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">
          /api/oura/callback
        </code>{" "}
        in the{" "}
        <Link
          href="https://cloud.ouraring.com/oauth/applications"
          className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          Oura developer console
        </Link>
        . Docs:{" "}
        <Link
          href="https://cloud.ouraring.com/docs/authentication#oauth2-directing-users"
          className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          OAuth2
        </Link>
        .
      </p>
    </section>
  );
}
