import { isEditable, updateClaimSchema } from "@claims/shared";
import type { Json, TablesUpdate } from "@claims/supabase/types";
import { requireUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { ok, parseBody, route } from "@/lib/api/handler";
import {
  buildClaimDetail,
  getAgentClaim,
  getAgentClaimRow,
} from "@/lib/queries/claims";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/claims/:id — own claim with files (signed URLs) and agent_visible notes. */
export const GET = route<Ctx>(async (request, { params }) => {
  const { user, db } = await requireUser(request);
  const { id } = await params;

  const detail = await getAgentClaim(db, user.id, id);
  if (!detail) throw new ApiError("NOT_FOUND", "Claim not found.");
  return ok(detail);
});

/**
 * PATCH /api/claims/:id — edit fields while draft or info_requested. The update object is built ONLY from
 * the zod output, field by field: status, assigned_to and agent_id can never be sent from here.
 */
export const PATCH = route<Ctx>(async (request, { params }) => {
  const { user, db } = await requireUser(request);
  const { id } = await params;

  const claim = await getAgentClaimRow(db, user.id, id);
  if (!claim) throw new ApiError("NOT_FOUND", "Claim not found.");
  if (!isEditable(claim.status)) {
    throw new ApiError(
      "INVALID_STATE",
      `A claim in status "${claim.status}" cannot be edited.`,
    );
  }

  const body = await parseBody(request, updateClaimSchema);
  const patch: TablesUpdate<"claims"> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.claim_type !== undefined) patch.claim_type = body.claim_type;
  if (body.description !== undefined) patch.description = body.description;
  if (body.incident_date !== undefined)
    patch.incident_date = body.incident_date;
  if (body.policy_number !== undefined)
    patch.policy_number = body.policy_number;
  if (body.claimant_name !== undefined)
    patch.claimant_name = body.claimant_name;
  // Record<string, unknown> from request.json() is JSON by construction (see POST /api/claims).
  if (body.details !== undefined) patch.details = body.details as Json;

  // Nothing to change: skip the round trip (and the 'updated' audit event it would not produce anyway).
  if (Object.keys(patch).length === 0)
    return ok(await buildClaimDetail(db, claim));

  const { data, error } = await db
    .from("claims")
    .update(patch)
    .eq("id", claim.id)
    .eq("agent_id", user.id)
    .select("*")
    .single();
  if (error) throw error;

  return ok(await buildClaimDetail(db, data));
});
