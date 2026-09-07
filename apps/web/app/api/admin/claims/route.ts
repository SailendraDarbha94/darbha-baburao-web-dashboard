import { NextResponse } from "next/server";
import { adminClaimsQuerySchema } from "@claims/shared";
import { requireAdmin } from "@/lib/api/auth";
import { parseQuery, route } from "@/lib/api/handler";
import { listAdminClaims } from "@/lib/queries/admin";

/**
 * GET /api/admin/claims?status=&assigned_to=&agent_id=&from=&to=&sort=&order=&page=&per_page= — filtered,
 * sorted, paginated claims (docs/PLAN.md §3, decision k). The same query function backs the server-rendered
 * /claims page (decision b).
 */
export const GET = route(async (request) => {
  const { db } = await requireAdmin(request);
  const query = parseQuery(
    request.nextUrl.searchParams,
    adminClaimsQuerySchema,
  );

  // Paginated<T> is the whole response body ({ data, page, per_page, total }), not wrapped in ok()'s { data }.
  return NextResponse.json(await listAdminClaims(db, query));
});
