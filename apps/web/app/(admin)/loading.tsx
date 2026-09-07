import { LoadingStatus, Skeleton, SkeletonText } from "@/components/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Suspense fallback for "/" — app/(admin)/page.tsx owns that route, and this is the group's own segment
// fallback, so it mirrors the overview: four stat tiles, then the four chart cards in the same 2-column
// grid.
//
// It is NOT a generic safety net any more: the titles below are the overview's, so a new admin route
// without its own loading.tsx would flash a dashboard header before showing something unrelated. Every
// admin route ships its own loading.tsx (/claims, /claims/[id], /agents each have one); keep doing that.
//
// House pattern (same as the other loading.tsx files): text that never depends on the data — the heading
// and the card titles — is real, only the numbers and the chart bodies are placeholders, so the page does
// not jump when the query lands. One sr-only status region for the whole route.

// Same labels, in the same order, as <StatTiles> on the overview page.
const TILES = ["Total claims", "Open", "Approved", "Rejected"];

// Same titles, in the same order and with the same column spans, as the chart cards.
const CHARTS = [
  { title: "Claims by status", span: "" },
  { title: "Claims by type", span: "" },
  { title: "Claims per agent", span: "md:col-span-2" },
  { title: "Claims created over time", span: "md:col-span-2" },
];

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-4">
      <LoadingStatus label="Loading dashboard" />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <SkeletonText className="w-64" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TILES.map((tile) => (
          <Card key={tile} className="min-w-0">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {tile}
              </span>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CHARTS.map((chart) => (
          <Card key={chart.title} className={cn("min-w-0", chart.span)}>
            <CardHeader>
              <CardTitle>{chart.title}</CardTitle>
              {/* Wrapped in CardDescription, not bare, so CardHeader lays its grid out exactly as
                  it does on the real page and the title does not shift when the data arrives. */}
              <CardDescription>
                <SkeletonText className="w-48" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
