import {
  LoadingStatus,
  Skeleton,
  SkeletonTableRows,
} from "@/components/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Suspense fallback for /claims while the Server Component runs its Supabase queries. It mirrors
// app/(admin)/claims/page.tsx: heading, filter bar, the same eight-column table, pagination row.
// The heading, the column labels and the filter labels are real text (they never depend on the data),
// so only the values swap in and the page does not jump when it arrives.

// Same columns, in the same order, as <ClaimsTable>.
const COLUMNS = [
  "Title",
  "Status",
  "Type",
  "Agent",
  "Assignee",
  "Incident",
  "Created",
  "Updated",
];

// Same fields, in the same order and with the same widths, as <ClaimsFilters>.
const FILTERS = [
  { label: "Status", width: "w-40" },
  { label: "Assignee", width: "w-44" },
  { label: "Agent", width: "w-44" },
  { label: "Created from", width: "w-40" },
  { label: "Created to", width: "w-40" },
];

export default function ClaimsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <LoadingStatus label="Loading claims" />
      <h1 className="text-2xl font-semibold">Claims</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        {FILTERS.map((filter) => (
          <div key={filter.label} className="flex flex-col gap-1.5">
            <span className="text-sm leading-none font-medium">
              {filter.label}
            </span>
            <Skeleton className={cn("h-8 rounded-lg", filter.width)} />
          </div>
        ))}
        {/* Mirrors the filter bar's action group: the Apply button plus the static "Clear" link, so the
            flex-wrap bar breaks at the same width in the fallback as in the real page. */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <span className="text-sm">Clear</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <SkeletonTableRows rows={8} cols={COLUMNS.length} />
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
