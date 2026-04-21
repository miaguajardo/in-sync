import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for In Sync and Oura API integration.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mb-10 text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: March 21, 2025 · Draft for review — not legal advice.
        </p>

        <div className="space-y-8 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              1. Agreement
            </h2>
            <p>
              By using this application (&quot;Service&quot;), you agree to these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              2. Oura integration
            </h2>
            <p>
              The Service may connect to your Oura account through Oura&apos;s API
              to read and display wellness and activity data you authorize. Your
              use of Oura is also governed by Oura&apos;s own terms and policies.
              We do not control Oura&apos;s services and are not responsible for
              their availability, accuracy, or changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              3. Your account and authorization
            </h2>
            <p>
              You are responsible for any activity under credentials you use with
              the Service. App access is authenticated with Google (via Supabase);
              keep your Google account secure. When you connect Oura, you represent
              that you have the right to grant access to the data you share. You may
              revoke access through Oura or through in-app controls when available.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              4. Acceptable use
            </h2>
            <p>
              You agree not to misuse the Service — for example, by attempting to
              access data you are not authorized to view, interfering with the
              Service or Oura&apos;s systems, or violating applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              5. Disclaimers and limitation of liability
            </h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any
              kind. To the fullest extent permitted by law, we are not liable for
              indirect or consequential damages arising from your use of the
              Service or reliance on data shown in the app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              6. Changes
            </h2>
            <p>
              We may update these terms from time to time. Continued use of the
              Service after changes means you accept the updated terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              7. Contact
            </h2>
            <p>
              Questions about these terms: add your support email or contact form
              here before launch.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
