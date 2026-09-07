import { canTransition, submittableClaimSchema } from "@claims/shared";
import { z } from "zod";
import { requireUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import {
  buildClaimDetail,
  getAgentClaimRow,
  listClaimFiles,
} from "@/lib/queries/claims";
import { signFileUrls } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/claims/:id/submit — draft → submitted, or info_requested → submitted (docs/PLAN.md §3).
 * No body. The transition table is checked here first; claims_guard_update re-checks it in the DB and its
 * CL001 maps to INVALID_TRANSITION too, so a direct PostgREST caller gets the same answer.
 */
export const POST = route<Ctx>(async (request, { params }) => {
  const { user, db } = await requireUser(request);
  const { id } = await params;

  const claim = await getAgentClaimRow(db, user.id, id);
  if (!claim) throw new ApiError("NOT_FOUND", "Claim not found.");
  if (!canTransition(claim.status, "submitted", "agent")) {
    throw new ApiError(
      "INVALID_TRANSITION",
      `A claim in status "${claim.status}" cannot be submitted.`,
    );
  }

  // Decision o: the structured fields are nullable in the DB so drafts can be saved incomplete, and
  // required at submit time. Validated against the STORED row, so what was saved is what is checked.
  const complete = submittableClaimSchema.safeParse(claim);
  if (!complete.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Fill in the required fields before submitting.",
      z.flattenError(complete.error),
    );
  }

  // Prune reservations whose bytes never arrived. Only from draft: the claim_files DELETE policy (and the
  // 'file_removed' audit event it triggers) only work while the claim is draft. From info_requested the
  // files were pruned at the first submit and cannot have changed since (decision p).
  if (claim.status === "draft") {
    const files = await signFileUrls(db, await listClaimFiles(db, claim.id));
    const missingIds = files
      .filter((file) => file.url === null)
      .map((file) => file.id);
    if (missingIds.length > 0) {
      const { error } = await db
        .from("claim_files")
        .delete()
        .eq("claim_id", claim.id)
        .in("id", missingIds);
      if (error) throw error;
    }
  }

  const { data, error } = await db
    .from("claims")
    .update({ status: "submitted" })
    .eq("id", claim.id)
    .eq("agent_id", user.id)
    .select("*")
    .single();
  if (error) throw error;

  return ok(await buildClaimDetail(db, data));
});
