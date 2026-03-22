import Link from "next/link";
import { poems } from "@/lib/poetry";
import { plays } from "@/lib/plays";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-stone-100 to-stone-50 py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-stone-800 mb-4">
            Darbha Babu Rao
          </h1>
          <p className="text-lg text-amber-700 font-medium mb-8">
            Educator &bull; Scholar &bull; Poet &bull; Playwright
          </p>
          <div className="inline-block rounded-xl bg-white shadow-sm border border-stone-200 px-8 py-6 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-stone-600">
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-400">Date of Birth</span>
                <p className="font-medium text-stone-800">9th February, 1946</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-400">Place of Birth</span>
                <p className="font-medium text-stone-800">Bapatla, Andhra Pradesh</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-400">Father</span>
                <p className="font-medium text-stone-800">Late Sri Darbha Lakshmi Narayana Sastry</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-400">Mother</span>
                <p className="font-medium text-stone-800">Late Smt. Darbha Jwala Annapurna Visalakshi</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-stone-800 text-center mb-12">Education</h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-stone-200 -translate-x-1/2 hidden sm:block" />

            <div className="space-y-10">
              <TimelineItem
                side="left"
                title="Elementary"
                institution="Mamillapalli Sitaramaiah Elementary School"
                location="Bapatla, AP"
              />
              <TimelineItem
                side="right"
                title="High School"
                institution="Board/Municipal High School"
                location="Bapatla, AP"
              />
              <TimelineItem
                side="left"
                title="Pre-University (PUC)"
                institution="VRS & YRN College of Arts and Science"
                location="Chirala, AP"
              />
              <TimelineItem
                side="right"
                title="Graduation (B.Com)"
                institution="C S R Sarma College"
                location="Ongole, AP"
              />
              <TimelineItem
                side="left"
                title="Post-Graduation (M.Com)"
                institution="Andhra University"
                location="Visakhapatnam, AP"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Career Section */}
      <section className="bg-stone-100 py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-stone-800 text-center mb-12">Career</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl bg-white border border-stone-200 shadow-sm p-6">
              <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 mb-4">
                1998 &ndash; 2004
              </span>
              <h3 className="text-xl font-bold text-stone-800 mb-1">
                Head of Department of Commerce
              </h3>
              <p className="text-stone-500">
                The Bapatla College of Arts &amp; Sciences, Bapatla (AP)
              </p>
            </div>
            <div className="rounded-xl bg-white border border-stone-200 shadow-sm p-6">
              <span className="inline-block rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 mb-4">
                Retired 2004
              </span>
              <h3 className="text-xl font-bold text-stone-800 mb-1">
                Vice-Principal
              </h3>
              <p className="text-stone-500">
                The Bapatla College of Arts &amp; Sciences, Bapatla (AP)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Literary Works Section */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-stone-800 text-center mb-4">Literary Works</h2>
          <p className="text-stone-500 text-center mb-12 max-w-xl mx-auto">
            Explore the poetry and plays of Darbha Babu Rao.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/poetry"
              className="group rounded-xl bg-white border border-stone-200 shadow-sm p-8 hover:shadow-md hover:border-amber-200 transition-all text-center"
            >
              <div className="text-4xl mb-4">&#9997;</div>
              <h3 className="text-2xl font-bold text-stone-800 group-hover:text-amber-800 transition-colors mb-2">
                Poetry
              </h3>
              <p className="text-stone-500 text-sm mb-4">
                {poems.length} {poems.length === 1 ? "poem" : "poems"} in the collection
              </p>
              <span className="text-sm text-amber-700 font-medium group-hover:translate-x-1 inline-block transition-transform">
                Browse poetry &rarr;
              </span>
            </Link>
            <Link
              href="/plays"
              className="group rounded-xl bg-white border border-stone-200 shadow-sm p-8 hover:shadow-md hover:border-amber-200 transition-all text-center"
            >
              <div className="text-4xl mb-4">&#127917;</div>
              <h3 className="text-2xl font-bold text-stone-800 group-hover:text-amber-800 transition-colors mb-2">
                Plays
              </h3>
              <p className="text-stone-500 text-sm mb-4">
                {plays.length} {plays.length === 1 ? "play" : "plays"} in the collection
              </p>
              <span className="text-sm text-amber-700 font-medium group-hover:translate-x-1 inline-block transition-transform">
                Browse plays &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function TimelineItem({
  side,
  title,
  institution,
  location,
}: {
  side: "left" | "right";
  title: string;
  institution: string;
  location: string;
}) {
  return (
    <div className={`relative flex flex-col sm:flex-row items-start sm:items-center gap-4 ${side === "right" ? "sm:flex-row-reverse" : ""}`}>
      {/* Dot */}
      <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow" />

      {/* Content */}
      <div className={`sm:w-1/2 ${side === "left" ? "sm:pr-10 sm:text-right" : "sm:pl-10 sm:text-left"}`}>
        <span className="text-xs uppercase tracking-wider text-amber-700 font-semibold">{title}</span>
        <h3 className="text-lg font-bold text-stone-800 mt-1">{institution}</h3>
        <p className="text-stone-500 text-sm">{location}</p>
      </div>

      {/* Spacer for opposite side */}
      <div className="hidden sm:block sm:w-1/2" />
    </div>
  );
}
