import { requireAdmin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { getAdminClaimDetail } from "@/lib/queries/admin";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/claims/:id — claim + agent/assignee + files (signed URLs) + notes of both visibilities + events. */
export const GET = route<Ctx>(async (request, { params }) => {
  const { db } = await requireAdmin(request);
  const { id } = await params;

  const detail = await getAdminClaimDetail(db, id);
  if (!detail) throw new ApiError("NOT_FOUND", "Claim not found.");
  return ok(detail);
});
