import { z } from "zod";
import { CLAIM_STATUSES, NOTE_VISIBILITIES } from "../constants";
import { optionalQuery } from "./common";

export const ADMIN_CLAIMS_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "status",
  "title",
] as const;

/** GET /api/admin/claims query string (also parsed by the server-rendered claims table). Numbers arrive as strings. */
export const adminClaimsQuerySchema = z.object({
  status: optionalQuery(z.enum(CLAIM_STATUSES)),
  assigned_to: optionalQuery(z.uuid()),
  agent_id: optionalQuery(z.uuid()),
  from: optionalQuery(z.iso.date()),
  to: optionalQuery(z.iso.date()),
  sort: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(ADMIN_CLAIMS_SORT_FIELDS).default("created_at"),
  ),
  order: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["asc", "desc"]).default("desc"),
  ),
  page: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().min(1).default(1),
  ),
  per_page: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().min(1).max(100).default(25),
  ),
});
export type AdminClaimsQuery = z.infer<typeof adminClaimsQuerySchema>;

/** POST /api/admin/claims/:id/status. An optional message is stored as an agent_visible note. */
export const changeStatusSchema = z.object({
  status: z.enum(CLAIM_STATUSES),
  message: z
    .string()
    .trim()
    .max(10000)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

/** POST /api/admin/claims/:id/assign. null unassigns. */
export const assignClaimSchema = z.object({
  assigned_to: z.uuid().nullable(),
});
export type AssignClaimInput = z.infer<typeof assignClaimSchema>;

/** POST /api/admin/claims/:id/notes. */
export const createNoteSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  visibility: z.enum(NOTE_VISIBILITIES),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
