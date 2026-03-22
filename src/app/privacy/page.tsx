import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Darbha Babu Rao",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 py-16 px-6">
      <article className="mx-auto max-w-3xl prose-stone">
        <Link href="/" className="text-sm text-amber-700 hover:text-amber-900 transition-colors mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-stone-800 mb-2">Privacy Policy</h1>
        <p className="text-sm text-stone-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-6 text-stone-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Introduction</h2>
            <p>
              This website is a personal, non-commercial website dedicated to Darbha Babu Rao.
              Your privacy is important to us. This Privacy Policy explains how we collect, use,
              and protect any information when you visit this website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Information We Collect</h2>
            <p>
              This website does not collect personal information from visitors unless you
              voluntarily provide it (e.g., through a contact form). We may collect standard
              web server log information, including your IP address, browser type, and pages
              visited, solely for the purpose of maintaining and improving the website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Cookies</h2>
            <p>
              This website may use essential cookies required for basic functionality such as
              authentication. We do not use cookies for advertising or tracking purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Third-Party Services</h2>
            <p>
              This website may use third-party services (such as hosting providers or analytics
              tools) that may collect anonymous usage data. These services operate under their
              own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Data Security</h2>
            <p>
              We take reasonable measures to protect any information collected through this
              website. However, no method of transmission over the internet is completely
              secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted
              on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please reach out to the
              website administrator.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
