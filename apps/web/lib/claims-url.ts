import { adminClaimsQuerySchema, type AdminClaimsQuery } from "@claims/shared";

// The /claims list is driven entirely by its search params (docs/PLAN.md decision k), so the filter form,
// the sortable headers and the pagination links all rebuild the same URL with one field changed.

/** The schema defaults (page 1, 25 per page, created_at desc); links and the filter form omit fields at these values. */
export const CLAIMS_QUERY_DEFAULTS = adminClaimsQuerySchema.parse({});

/** `/claims?...` for `query` with `overrides` applied; values equal to the schema defaults are omitted. */
export function claimsListHref(
  query: AdminClaimsQuery,
  overrides: Partial<AdminClaimsQuery> = {},
): string {
  const merged: AdminClaimsQuery = { ...query, ...overrides };
  const params = new URLSearchParams();

  for (const key of [
    "status",
    "assigned_to",
    "agent_id",
    "from",
    "to",
  ] as const) {
    const value = merged[key];
    if (value) params.set(key, value);
  }
  const { sort, order, page, per_page } = merged;
  if (sort !== CLAIMS_QUERY_DEFAULTS.sort) params.set("sort", sort);
  if (order !== CLAIMS_QUERY_DEFAULTS.order) params.set("order", order);
  if (page !== CLAIMS_QUERY_DEFAULTS.page) params.set("page", String(page));
  if (per_page !== CLAIMS_QUERY_DEFAULTS.per_page) {
    params.set("per_page", String(per_page));
  }

  const qs = params.toString();
  return qs ? `/claims?${qs}` : "/claims";
}
