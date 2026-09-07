import {
  LoadingStatus,
  Skeleton,
  SkeletonField,
  SkeletonText,
} from "@/components/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Suspense fallback for /claims/[id] while the Server Component loads the claim, the agent list and the
// profiles named on the page. It mirrors app/(admin)/claims/[id]/page.tsx: back link, title block with
// the six-field meta grid, then the two-column body — claim card, files, notes, timeline on the left and
// the actions column on the right. Card titles that do not depend on the data are kept as real text.

export default function ClaimDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <LoadingStatus label="Loading claim" />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">← All claims</span>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-5 w-24 rounded-4xl" />
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonField key={index} />
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Claim</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <SkeletonField key={index} />
                ))}
              </dl>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium">Description</h3>
                <SkeletonText />
                <SkeletonText />
                <SkeletonText className="w-2/3" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Details</h3>
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[8rem_1fr] gap-x-4"
                  >
                    <SkeletonText className="w-24" />
                    <SkeletonText className="w-1/2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Same tile grid as <FileGallery>: a square thumbnail over two caption lines. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-lg border p-2"
                  >
                    <Skeleton className="aspect-square w-full" />
                    <SkeletonText className="h-3 w-3/4" />
                    <SkeletonText className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }, (_, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-lg border-l-4 border-l-muted-foreground/40 bg-muted/40 p-3 ring-1 ring-foreground/10"
                  >
                    <Skeleton className="h-3 w-48" />
                    <SkeletonText />
                    <SkeletonText className="w-4/5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 border-l pl-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="flex flex-col gap-1">
                    <SkeletonText className="w-2/3" />
                    <Skeleton className="h-3 w-40" />
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* The actions column (<ClaimActions>): three separate size="sm" cards, one small form each.
            The titles are static in the real page, so they are rendered for real here too and only the
            controls swap in. The taller blocks stand in for the two <Textarea> fields. */}
        <aside className="min-w-0">
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Change status</CardTitle>
                <SkeletonText className="w-40" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Assign</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Add note</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
