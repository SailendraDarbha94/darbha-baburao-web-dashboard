import Link from "next/link";
import {
  ADMIN_CLAIMS_SORT_FIELDS,
  type AdminClaimSummary,
  type AdminClaimsQuery,
} from "@claims/shared";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { claimsListHref } from "@/lib/claims-url";
import { formatDate, formatDateTime } from "@/lib/format";

type SortField = (typeof ADMIN_CLAIMS_SORT_FIELDS)[number];

// Server Component. Sortable headers are links that rewrite the search params (docs/PLAN.md §1), so the
// table has no client state; the whole page re-renders on the server for every sort, filter or page.
export function ClaimsTable({
  claims,
  query,
}: {
  claims: AdminClaimSummary[];
  query: AdminClaimsQuery;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHeader field="title" label="Title" query={query} />
          <SortHeader field="status" label="Status" query={query} />
          <TableHead>Type</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Incident</TableHead>
          <SortHeader field="created_at" label="Created" query={query} />
          <SortHeader field="updated_at" label="Updated" query={query} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.map((claim) => (
          <TableRow key={claim.id}>
            <TableCell className="max-w-xs truncate font-medium">
              <Link href={`/claims/${claim.id}`} className="hover:underline">
                {claim.title}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={claim.status} />
            </TableCell>
            <TableCell>{claim.claim_type}</TableCell>
            <TableCell>{claim.agent.full_name || claim.agent.id}</TableCell>
            <TableCell>
              {claim.assignee ? (
                claim.assignee.full_name || claim.assignee.id
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </TableCell>
            <TableCell>
              {claim.incident_date ? (
                formatDate(claim.incident_date)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>{formatDateTime(claim.created_at)}</TableCell>
            <TableCell>{formatDateTime(claim.updated_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Clicking the active column flips the order; clicking another column sorts it descending for dates
// (newest first is what an admin wants) and ascending for text. Either way the page resets to 1.
function SortHeader({
  field,
  label,
  query,
}: {
  field: SortField;
  label: string;
  query: AdminClaimsQuery;
}) {
  const active = query.sort === field;
  const nextOrder = active
    ? query.order === "asc"
      ? "desc"
      : "asc"
    : field === "created_at" || field === "updated_at"
      ? "desc"
      : "asc";
  const href = claimsListHref(query, {
    sort: field,
    order: nextOrder,
    page: 1,
  });
  const arrow = active ? (query.order === "asc" ? "▲" : "▼") : null;

  return (
    <TableHead aria-sort={active ? ariaSort(query.order) : "none"}>
      <Link
        href={href}
        className="inline-flex items-center gap-1 hover:underline"
      >
        {label}
        {arrow ? <span aria-hidden="true">{arrow}</span> : null}
      </Link>
    </TableHead>
  );
}

function ariaSort(
  order: AdminClaimsQuery["order"],
): "ascending" | "descending" {
  return order === "asc" ? "ascending" : "descending";
}
