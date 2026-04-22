import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const snap = await getDoc(doc(db, "poems", id));
  const title = snap.exists() ? (snap.data().title as string) : undefined;
  return {
    title: title ? `${title} — Poetry — Darbha Babu Rao` : "Poem Not Found",
  };
}

export default async function PoemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snap = await getDoc(doc(db, "poems", id));

  if (!snap.exists()) {
    notFound();
  }

  const data = snap.data();
  const rawContent = data.content;
  const content: string[] = Array.isArray(rawContent)
    ? (rawContent as string[])
    : typeof rawContent === "string" && rawContent.trim()
    ? [rawContent]
    : [];
  const poem = {
    title: (data.title as string) ?? "",
    year: (data.year as string) ?? "",
    content,
  };

  return (
    <main className="flex-1 py-16 px-6">
      <article className="mx-auto max-w-3xl">
        <Link href="/poetry" className="text-sm text-amber-700 hover:text-amber-900 transition-colors mb-8 inline-block">
          &larr; Back to Poetry
        </Link>

        {poem.year && (
          <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 mb-4">
            {poem.year}
          </span>
        )}
        <h1 className="text-4xl font-bold text-stone-800 mb-8 font-telugu">{poem.title}</h1>

        <div className="space-y-6 text-stone-700 leading-relaxed text-lg font-telugu">
          {poem.content.map((stanza, i) => (
            <p key={i} className="whitespace-pre-line">{stanza}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
