import type { DeletedFile } from "@claims/shared";
import { requireUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { getAgentClaimRow } from "@/lib/queries/claims";
import { removeObject } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

/**
 * DELETE /api/claims/:id/files/:fileId — remove an attachment while the claim is a draft (decision p).
 * Object first, row second: the storage DELETE policy joins on the claim_files row, so once the row is gone
 * the object could never be removed. A missing object (the upload never happened) is not an error.
 */
export const DELETE = route<Ctx>(async (request, { params }) => {
  const { user, db } = await requireUser(request);
  const { id, fileId } = await params;

  const claim = await getAgentClaimRow(db, user.id, id);
  if (!claim) throw new ApiError("NOT_FOUND", "Claim not found.");

  const { data: file, error: fileError } = await db
    .from("claim_files")
    .select("*")
    .eq("id", fileId)
    .eq("claim_id", claim.id)
    .maybeSingle();
  if (fileError) throw fileError;
  if (!file) throw new ApiError("NOT_FOUND", "File not found.");

  if (claim.status !== "draft") {
    throw new ApiError(
      "INVALID_STATE",
      "Files can only be removed while the claim is a draft.",
    );
  }

  await removeObject(db, file.storage_path);

  // .select() so a zero-row delete is visible: the row was just read, so no row back means the DELETE
  // policy hid it — the claim left draft between the read and the delete.
  const { data: deleted, error } = await db
    .from("claim_files")
    .delete()
    .eq("id", file.id)
    .eq("claim_id", claim.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!deleted) {
    throw new ApiError(
      "INVALID_STATE",
      "Files can only be removed while the claim is a draft.",
    );
  }

  const result: DeletedFile = { id: deleted.id };
  return ok(result);
});
