import Link from "next/link";
import type { Metadata } from "next";
import { plays } from "@/lib/talks";

export const metadata: Metadata = {
  title: "Talks — Darbha Babu Rao",
  description: "A collection of talks written by Darbha Babu Rao.",
};

export default function TalksPage() {
  return (
    <main className="flex-1 py-16 px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-amber-700 hover:text-amber-900 transition-colors mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-stone-800 mb-3">Talks</h1>
        <p className="text-stone-500 mb-12">
          A collection of talks written by Darbha Babu Rao.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {plays.map((play) => (
            <Link
              key={play.id}
              href={`/talks/${play.id}`}
              className="group rounded-xl bg-white border border-stone-200 shadow-sm p-6 hover:shadow-md hover:border-amber-200 transition-all"
            >
              {play.year && (
                <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 mb-3">
                  {play.year}
                </span>
              )}
              <h2 className="text-xl font-bold text-stone-800 group-hover:text-amber-800 transition-colors mb-2 font-telugu">
                {play.title}
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed line-clamp-3 font-telugu">
                {play.description}
              </p>
              <span className="inline-block mt-4 text-sm text-amber-700 font-medium group-hover:translate-x-1 transition-transform">
                Read talk &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
