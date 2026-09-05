import { z } from "zod";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "../constants";

/** POST /api/claims/:id/files. The bucket re-checks type and size when the bytes arrive. */
export const createFileUploadSchema = z.object({
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.enum(ALLOWED_MIME_TYPES),
  size_bytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
});
export type CreateFileUploadInput = z.infer<typeof createFileUploadSchema>;
