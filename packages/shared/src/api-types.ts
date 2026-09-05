// Wire types shared by the route handlers (apps/web) and their callers (apps/mobile, web client components).
// Plain TypeScript: this package must not depend on the generated DB types in @claims/supabase.
import type {
  ClaimEventType,
  ClaimStatus,
  NoteVisibility,
  UserRole,
} from "./constants";

export const API_ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "INVALID_TRANSITION",
  "INVALID_STATE",
  "FILE_TYPE_NOT_ALLOWED",
  "FILE_TOO_LARGE",
  "INTERNAL",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Every non-2xx response. `details` is present only on VALIDATION_ERROR and carries z.flattenError() output. */
export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type Ok<T> = { data: T };

export type Paginated<T> = {
  data: T[];
  page: number;
  per_page: number;
  total: number;
};

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRef = Pick<Profile, "id" | "full_name">;

/** POST /api/me/push-token response. */
export type PushTokenResult = Pick<Profile, "expo_push_token">;

export type ClaimSummary = {
  id: string;
  agent_id: string;
  assigned_to: string | null;
  status: ClaimStatus;
  title: string;
  claim_type: string;
  incident_date: string | null;
  policy_number: string | null;
  claimant_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ClaimFile = {
  id: string;
  claim_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

/** DELETE /api/claims/:id/files/:fileId response. */
export type DeletedFile = Pick<ClaimFile, "id">;

/** A file row plus a short-lived signed download URL; null when the upload never landed. */
export type FileWithUrl = ClaimFile & { url: string | null };

export type ClaimNote = {
  id: string;
  claim_id: string;
  author_id: string;
  body: string;
  visibility: NoteVisibility;
  created_at: string;
};

export type ClaimEvent = {
  id: number;
  claim_id: string;
  actor_id: string | null;
  event_type: ClaimEventType;
  payload: Record<string, unknown>;
  created_at: string;
};

/** GET /api/claims/:id — agents only ever receive agent_visible notes (enforced by RLS). */
export type ClaimDetail = ClaimSummary & {
  description: string;
  details: Record<string, unknown>;
  files: FileWithUrl[];
  notes: ClaimNote[];
};

export type AdminClaimSummary = ClaimSummary & {
  agent: ProfileRef;
  assignee: ProfileRef | null;
};

export type AdminClaimDetail = ClaimDetail & {
  agent: ProfileRef;
  assignee: ProfileRef | null;
  events: ClaimEvent[];
};

export type AgentWithCounts = {
  id: string;
  full_name: string;
  created_at: string;
  counts: Record<ClaimStatus, number>;
  total: number;
};

/** POST /api/claims/:id/files response: the reservation row and where to PUT the bytes. */
export type SignedUpload = {
  file: ClaimFile;
  upload: {
    signed_url: string;
    token: string;
    path: string;
    expires_at: string;
  };
};
