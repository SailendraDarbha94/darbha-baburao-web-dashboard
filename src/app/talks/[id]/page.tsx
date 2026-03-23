import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { plays } from "@/lib/talks";

export function generateStaticParams() {
  return plays.map((play) => ({ id: play.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const play = plays.find((p) => p.id === id);
  return {
    title: play ? `${play.title} — Talks — Darbha Babu Rao` : "Talk Not Found",
  };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const play = plays.find((p) => p.id === id);

  if (!play) {
    notFound();
  }

  return (
    <main className="flex-1 py-16 px-6">
      <article className="mx-auto max-w-3xl">
        <Link href="/talks" className="text-sm text-amber-700 hover:text-amber-900 transition-colors mb-8 inline-block">
          &larr; Back to Talks
        </Link>

        {play.year && (
          <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 mb-4">
            {play.year}
          </span>
        )}
        <h1 className="text-4xl font-bold text-stone-800 mb-8 font-telugu">{play.title}</h1>

        <div className="space-y-6 text-stone-700 leading-relaxed text-lg font-telugu">
          {play.content.map((section, i) => (
            <p key={i} className="whitespace-pre-line">{section}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
