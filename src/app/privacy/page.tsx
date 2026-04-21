import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How In Sync handles your data when you connect Oura and use the app.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-zinc-900 dark:text-zinc-100">
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            ← Home
          </Link>
        </p>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mb-10 text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: March 21, 2025 · Draft for review — not legal advice.
        </p>

        <div className="space-y-8 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              1. Overview
            </h2>
            <p>
              This policy describes how we collect, use, and share information when
              you use this application (&quot;Service&quot;), including when you
              connect an Oura account via the Oura API. Sign-in uses Google via
              Supabase Auth; gym workouts, Oura link rows, and Oura OAuth tokens are
              stored per Supabase user account and isolated with database access
              controls.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              2. Information we collect
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Account and app data:
                </span>{" "}
                When you sign in with Google, Supabase receives an OAuth token and
                profile identifiers (such as email) according to Google&apos;s
                disclosures. We also store workout logs and related metadata you
                enter, plus technical data such as device type, browser, and
                approximate region from standard server logs.
              </li>
              <li>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Oura data:
                </span>{" "}
                When you authorize the connection, we receive categories of
                wellness and activity data that you permit through Oura&apos;s OAuth
                or API flow (for example, sleep, readiness, or activity summaries,
                depending on scopes you approve).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              3. How we use information
            </h2>
            <p>We use information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide, maintain, and improve the Service;</li>
              <li>Authenticate you and sync data you choose to connect;</li>
              <li>Respond to support requests and protect security;</li>
              <li>Comply with legal obligations where applicable.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              4. Third parties
            </h2>
            <p>
              Oura processes data according to its own privacy policy when you use
              their products and API. We may use infrastructure providers (for
              example, hosting or analytics) that process data on our behalf under
              appropriate agreements. List your subprocessors here before launch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              5. Retention and security
            </h2>
            <p>
              We retain information only as long as needed for the purposes above
              or as required by law. We use reasonable technical and organizational
              measures to protect data; no method of transmission or storage is
              completely secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              6. Your choices and rights
            </h2>
            <p>
              You can disconnect Oura in the app or through your Oura account
              settings where applicable. Depending on where you live, you may have
              rights to access, correct, delete, or export personal data, or to
              object to certain processing. Contact us to exercise those rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              7. Children
            </h2>
            <p>
              The Service is not intended for children under 13 (or the minimum
              age in your jurisdiction). We do not knowingly collect personal
              information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              8. Changes and contact
            </h2>
            <p>
              We may update this policy and will adjust the &quot;Last updated&quot;
              date when we do. For questions, add your privacy contact before
              launch.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
