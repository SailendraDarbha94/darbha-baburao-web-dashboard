import { redirect } from "next/navigation";
import {
  adminClaimsQuerySchema,
  type AdminClaimSummary,
  type AdminClaimsQuery,
  type Paginated,
} from "@claims/shared";
import { ClaimsFilters } from "@/components/claims-filters";
import { ClaimsTable } from "@/components/claims-table";
import { Pagination } from "@/components/pagination";
import { requireAdminPage } from "@/lib/api/page-auth";
import { claimsListHref } from "@/lib/claims-url";
import type { Db } from "@/lib/db";
import { listAdminClaims, listAgentRefs } from "@/lib/queries/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Server-rendered claims table (docs/PLAN.md §1, decision k). The URL's search params are the only
// state: parsed with the same adminClaimsQuerySchema as GET /api/admin/claims, then listAdminClaims runs
// over the cookie client so RLS (is_admin()) applies exactly as it does for the API.
export default async function ClaimsPage({
  searchParams,
}: PageProps<"/claims">) {
  // Per-segment check as well as the layout's (docs/PLAN.md decision j): a layout redirect does not stop
  // this page from rendering.
  await requireAdminPage();

  const parsed = adminClaimsQuerySchema.safeParse(
    lastValues(await searchParams),
  );
  // A hand-edited or stale URL (unknown status, malformed date) falls back to the defaults with a notice
  // rather than a 500 or an error page.
  const query = parsed.success ? parsed.data : adminClaimsQuerySchema.parse({});

  const db = await createServerSupabaseClient();
  const [claims, agents] = await Promise.all([
    listClaimsPage(db, query),
    listAgentRefs(db),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Claims</h1>

      {parsed.success ? null : (
        <p role="status" className="text-sm text-amber-700">
          Some filters in the URL were not valid and have been ignored.
        </p>
      )}

      <ClaimsFilters query={query} agents={agents} />

      {claims.data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No claims match these filters.
        </p>
      ) : (
        <ClaimsTable claims={claims.data} query={query} />
      )}

      <Pagination query={query} total={claims.total} />
    </div>
  );
}

// A `page` past the last page (a bookmarked link whose filters now match fewer rows) is a stale URL too.
// With `count: "exact"` PostgREST answers 416 / PGRST103 when the offset is past the count (offset > total)
// and an empty page when offset == total; both go back to page 1 instead of a 500 or an empty table under
// "Page 7 of 2". Page 1 has offset 0, so the redirect cannot loop.
async function listClaimsPage(
  db: Db,
  query: AdminClaimsQuery,
): Promise<Paginated<AdminClaimSummary>> {
  const claims = await listAdminClaims(db, query);
  // A page past the end (stale link, narrower filters) comes back empty with the real total; land the
  // admin on the first page instead of showing an empty table under "Page 7 of 2".
  if (query.page > 1 && claims.data.length === 0) {
    redirect(claimsListHref(query, { page: 1 }));
  }
  return claims;
}

// searchParams values are string | string[] | undefined; a repeated key keeps its last value, which is
// what URLSearchParams-based parseQuery does for the API, so the two parse identically.
function lastValues(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const last = Array.isArray(value) ? value[value.length - 1] : value;
    if (last !== undefined) out[key] = last;
  }
  return out;
}
