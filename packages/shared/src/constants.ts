// Single source of truth for the enumerations mirrored in packages/supabase/migrations. Two guards keep the two
// sides equal: packages/supabase/enum-check.ts (typecheck against the generated DB types) covers the three
// Postgres enums claim_status / user_role / note_visibility; constants.test.ts reads the migration files and
// covers those plus CLAIM_EVENT_TYPES (text + CHECK), ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES and STORAGE_BUCKET,
// which the generated types cannot express.

export const CLAIM_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "info_requested",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const USER_ROLES = ["agent", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const NOTE_VISIBILITIES = ["internal", "agent_visible"] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];

// Claim types are free-form text in the database. This list only populates the mobile picker, so it can be
// edited freely without a migration (decision c in docs/PLAN.md).
export const CLAIM_TYPES = [
  "Motor",
  "Property",
  "Liability",
  "Health",
  "Travel",
  "Other",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

// Statuses in which the owning agent may edit claim fields.
export const EDITABLE_STATUSES: readonly ClaimStatus[] = [
  "draft",
  "info_requested",
];

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// 25 MiB. Must match the bucket row and the claim_files CHECK constraint (docs/PLAN.md, open question 3).
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const STORAGE_BUCKET = "claim-files";

// Supabase Auth's "Minimum password length" (README → Dashboard settings, step 2; packages/supabase/config.toml
// for the local stack). passwordSchema mirrors it so the mobile forms reject a short password before the request.
export const PASSWORD_MIN_LENGTH = 8;

// Audit-log event types (claim_events.event_type CHECK constraint). status_changed, assigned and note_added are
// required by the brief; the other four are an [addition] that makes the admin timeline complete (docs/PLAN.md §2.2).
export const CLAIM_EVENT_TYPES = [
  "created",
  "updated",
  "status_changed",
  "assigned",
  "note_added",
  "file_reserved",
  "file_removed",
] as const;
export type ClaimEventType = (typeof CLAIM_EVENT_TYPES)[number];
