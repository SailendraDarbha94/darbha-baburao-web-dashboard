import { requireAdmin } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/handler";
import { listAgentsWithCounts } from "@/lib/queries/admin";

/** GET /api/admin/agents — profiles with role = agent plus a claim count per status (assignment dropdown, /agents page). */
export const GET = route(async (request) => {
  const { db } = await requireAdmin(request);
  return ok(await listAgentsWithCounts(db));
});
