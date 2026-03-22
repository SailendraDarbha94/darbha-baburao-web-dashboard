import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Darbha Babu Rao",
};

export default function TermsPage() {
  return (
    <main className="flex-1 py-16 px-6">
      <article className="mx-auto max-w-3xl prose-stone">
        <Link href="/" className="text-sm text-amber-700 hover:text-amber-900 transition-colors mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-stone-800 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-stone-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-6 text-stone-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Agreement to Terms</h2>
            <p>
              By accessing and using this website, you agree to be bound by these Terms and
              Conditions. If you do not agree with any part of these terms, please do not use
              this website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Intellectual Property</h2>
            <p>
              All content on this website, including text, images, and design, is the property
              of the Darbha family and is protected by applicable copyright laws.
              Copyright &copy; 2026. Unauthorized reproduction or distribution of any content
              from this website is prohibited without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Use of the Website</h2>
            <p>
              This is a personal, non-commercial website. You may browse the website for
              personal, informational purposes. You agree not to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Use the website for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the website</li>
              <li>Reproduce, duplicate, or copy any content without permission</li>
              <li>Interfere with the proper functioning of the website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Disclaimer</h2>
            <p>
              The information provided on this website is for general informational purposes
              only. While we strive to keep the content accurate and up to date, we make no
              warranties or representations of any kind, express or implied, about the
              completeness, accuracy, or reliability of the information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Limitation of Liability</h2>
            <p>
              In no event shall the website owner or contributors be liable for any damages
              arising from the use of or inability to use this website, even if advised of the
              possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">External Links</h2>
            <p>
              This website may contain links to external websites. We have no control over the
              content or practices of these sites and are not responsible for their content or
              privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Changes to These Terms</h2>
            <p>
              We reserve the right to update or modify these Terms and Conditions at any time
              without prior notice. Changes will be effective immediately upon posting to this
              page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-3">Contact</h2>
            <p>
              If you have any questions about these Terms and Conditions, please reach out to
              the website administrator.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
