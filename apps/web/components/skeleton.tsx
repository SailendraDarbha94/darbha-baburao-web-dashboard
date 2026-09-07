import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Presentational placeholders for the route-level loading.tsx files. The admin pages are Server
// Components that make several round trips to a remote Supabase region, so Next streams these as the
// Suspense fallback while the real page renders. No client hooks: they render inside Server Components.
//
// The colour is `bg-foreground/10` rather than `bg-muted` so the blocks stay visible both on the page
// background and inside a card (bg-card and bg-muted are close to each other in the dark palette).

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      // Decorative: the loading state is announced by the page-level status region, not by every block.
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-foreground/10", className)}
      {...props}
    />
  );
}

// One line of text. The default height matches the text-sm line box the pages use; pass a width class.
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

// Body rows for a <Table> whose real header row is already rendered, so only the data is a placeholder.
export function SkeletonTableRows({
  rows,
  cols,
}: {
  rows: number;
  cols: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: cols }, (_, col) => (
            <TableCell key={col}>
              <SkeletonText />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// A labelled field placeholder: the small caption above a value, used by the detail page's meta grids.
export function SkeletonField({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Skeleton className="h-3 w-16" />
      <SkeletonText className="w-28" />
    </div>
  );
}

// Screen-reader announcement for a whole route fallback. Every loading.tsx renders exactly one.
export function LoadingStatus({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {label}
    </p>
  );
}
