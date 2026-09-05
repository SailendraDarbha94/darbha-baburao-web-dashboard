import type {
  ClaimDetail,
  ClaimStatus,
  ClaimSummary,
  CreateClaimInput,
  CreateFileUploadInput,
  DeletedFile,
  PushTokenResult,
  SignedUpload,
  UpdateClaimInput,
} from "@claims/shared";
import { apiFetch } from "./api";

// One function per agent route in docs/PLAN.md §3. Bodies are typed with the shared zod input types so
// the mobile app and the route handlers cannot drift apart silently.

/** GET /api/claims — own claims, newest update first; optionally one status. */
export function listClaims(status?: ClaimStatus): Promise<ClaimSummary[]> {
  return apiFetch<ClaimSummary[]>("/api/claims", { query: { status } });
}

/** GET /api/claims/:id — claim with files (signed URLs) and agent-visible notes. */
export function getClaim(id: string): Promise<ClaimDetail> {
  return apiFetch<ClaimDetail>(`/api/claims/${encodeURIComponent(id)}`);
}

/** POST /api/claims — creates a draft. */
export function createClaim(input: CreateClaimInput): Promise<ClaimDetail> {
  return apiFetch<ClaimDetail>("/api/claims", { method: "POST", body: input });
}

/** PATCH /api/claims/:id — allowed while draft or info_requested. */
export function updateClaim(
  id: string,
  input: UpdateClaimInput,
): Promise<ClaimDetail> {
  return apiFetch<ClaimDetail>(`/api/claims/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

/** POST /api/claims/:id/submit — draft/info_requested → submitted; VALIDATION_ERROR lists missing fields. */
export function submitClaim(id: string): Promise<ClaimDetail> {
  return apiFetch<ClaimDetail>(`/api/claims/${encodeURIComponent(id)}/submit`, {
    method: "POST",
  });
}

/** POST /api/claims/:id/files — registers the file and returns where to PUT the bytes. Draft only. */
export function reserveUpload(
  id: string,
  input: CreateFileUploadInput,
): Promise<SignedUpload> {
  return apiFetch<SignedUpload>(`/api/claims/${encodeURIComponent(id)}/files`, {
    method: "POST",
    body: input,
  });
}

/** DELETE /api/claims/:id/files/:fileId — removes the object and the row. Draft only. */
export function deleteFile(id: string, fileId: string): Promise<DeletedFile> {
  return apiFetch<DeletedFile>(
    `/api/claims/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" },
  );
}

/** POST /api/me/push-token — null clears the token on sign-out. Called from lib/notifications.ts. */
export function registerPushToken(
  token: string | null,
): Promise<PushTokenResult> {
  return apiFetch<PushTokenResult>("/api/me/push-token", {
    method: "POST",
    body: { expo_push_token: token },
  });
}
