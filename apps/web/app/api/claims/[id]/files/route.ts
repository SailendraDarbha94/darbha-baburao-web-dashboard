import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  createFileUploadSchema,
  type SignedUpload,
} from "@claims/shared";
import { requireUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { ok, readJsonBody, route } from "@/lib/api/handler";
import { getAgentClaimRow, toClaimFile } from "@/lib/queries/claims";
import { createUploadUrl } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/claims/:id/files — reserve a file slot and return a signed upload URL (brief: "File upload
 * flow"; docs/PLAN.md decision f). The claim_files row is inserted FIRST because the storage INSERT policy
 * only signs paths that are registered; storage_path comes back from the BEFORE INSERT trigger and is never
 * sent. The bucket re-checks mime type and size when the bytes arrive.
 */
export const POST = route<Ctx>(async (request, { params }) => {
  const { user, db } = await requireUser(request);
  const { id } = await params;

  const claim = await getAgentClaimRow(db, user.id, id);
  if (!claim) throw new ApiError("NOT_FOUND", "Claim not found.");
  if (claim.status !== "draft") {
    throw new ApiError(
      "INVALID_STATE",
      "Files can only be added while the claim is a draft.",
    );
  }

  // The two file-specific codes are checked on the raw body before the generic schema, which would report
  // the same problems as an anonymous VALIDATION_ERROR (415 and 413 are what the picker UI switches on).
  const raw = await readJsonBody(request);
  if (typeof raw === "object" && raw !== null) {
    const { mime_type, size_bytes } = raw as Record<string, unknown>;
    if (
      typeof mime_type === "string" &&
      !(ALLOWED_MIME_TYPES as readonly string[]).includes(mime_type)
    ) {
      throw new ApiError(
        "FILE_TYPE_NOT_ALLOWED",
        `File type "${mime_type}" is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}.`,
      );
    }
    if (typeof size_bytes === "number" && size_bytes > MAX_FILE_SIZE_BYTES) {
      throw new ApiError(
        "FILE_TOO_LARGE",
        `Files must be at most ${MAX_FILE_SIZE_BYTES} bytes.`,
      );
    }
  }
  const body = createFileUploadSchema.parse(raw);

  const { data: row, error } = await db
    .from("claim_files")
    .insert({
      claim_id: claim.id,
      uploaded_by: user.id,
      file_name: body.file_name,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
    })
    .select("*")
    .single();
  if (error) throw error;

  let upload: SignedUpload["upload"];
  try {
    upload = await createUploadUrl(db, row.storage_path);
  } catch (signError) {
    // Without a URL the row is a dead reservation; remove it so the claim does not show a phantom file.
    // The delete's own failure is logged, not surfaced: the signing error is the one the client needs.
    const { error: deleteError } = await db
      .from("claim_files")
      .delete()
      .eq("id", row.id);
    if (deleteError) {
      console.error(
        "[api] could not roll back claim_files row",
        row.id,
        deleteError,
      );
    }
    throw signError;
  }

  const result: SignedUpload = { file: toClaimFile(row), upload };
  return ok(result, 201);
});
