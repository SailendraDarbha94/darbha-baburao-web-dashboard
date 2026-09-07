import type {
  AgentClaimsQuery,
  ClaimDetail,
  ClaimFile,
  ClaimNote,
  ClaimSummary,
  FileWithUrl,
} from "@claims/shared";
import type { Db } from "@/lib/db";
import type { Json, Tables } from "@claims/supabase/types";
import { signFileUrls } from "@/lib/storage";

// Agent-side claim reads (docs/PLAN.md decision b): plain functions over the caller's client, returning the
// wire types from @claims/shared. DB row types (Tables<...>) never leave this module; the mapping helpers
// below are the one place the two shapes meet, so a regenerated types.ts that drifts from the DTOs fails
// to compile here rather than leaking a column to clients.

export type ClaimRow = Tables<"claims">;
type FileRow = Tables<"claim_files">;
type NoteRow = Tables<"claim_notes">;

/** Own claims, newest activity first, optionally filtered by status. */
export async function listAgentClaims(
  db: Db,
  agentId: string,
  query: AgentClaimsQuery,
): Promise<ClaimSummary[]> {
  // .eq("agent_id") in addition to RLS: an admin signed in on mobile sees every claim under RLS, but the
  // agent flow is "my claims".
  let request = db
    .from("claims")
    .select("*")
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });
  if (query.status) request = request.eq("status", query.status);

  const { data, error } = await request;
  if (error) throw error;
  return data.map(toClaimSummary);
}

/** One own claim as a raw row, or null when it does not exist or belongs to someone else. */
export async function getAgentClaimRow(
  db: Db,
  agentId: string,
  claimId: string,
): Promise<ClaimRow | null> {
  const { data, error } = await db
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .eq("agent_id", agentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** One own claim with files (signed URLs) and notes (RLS returns only agent_visible), or null. */
export async function getAgentClaim(
  db: Db,
  agentId: string,
  claimId: string,
): Promise<ClaimDetail | null> {
  const row = await getAgentClaimRow(db, agentId, claimId);
  if (!row) return null;
  return buildClaimDetail(db, row);
}

/** Files (oldest first) for a claim the caller can see. */
export async function listClaimFiles(
  db: Db,
  claimId: string,
): Promise<ClaimFile[]> {
  const { data, error } = await db
    .from("claim_files")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toClaimFile);
}

/** Notes (oldest first) for a claim the caller can see; RLS decides which visibilities come back. */
async function listClaimNotes(db: Db, claimId: string): Promise<ClaimNote[]> {
  const { data, error } = await db
    .from("claim_notes")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toClaimNote);
}

/**
 * ClaimDetail for a row the caller already holds (after a write, or from getAgentClaim). Files and notes are
 * two independent reads, so they run concurrently.
 */
export async function buildClaimDetail(
  db: Db,
  row: ClaimRow,
): Promise<ClaimDetail> {
  const [files, notes] = await Promise.all([
    listClaimFiles(db, row.id),
    listClaimNotes(db, row.id),
  ]);
  return toClaimDetail(row, await signFileUrls(db, files), notes);
}

// ---------- row → DTO ----------
// Explicit field lists (no spread) so that a column added to the DB is never exposed by accident.

function toClaimSummary(row: ClaimRow): ClaimSummary {
  return {
    id: row.id,
    agent_id: row.agent_id,
    assigned_to: row.assigned_to,
    status: row.status,
    title: row.title,
    claim_type: row.claim_type,
    incident_date: row.incident_date,
    policy_number: row.policy_number,
    claimant_name: row.claimant_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toClaimDetail(
  row: ClaimRow,
  files: FileWithUrl[],
  notes: ClaimNote[],
): ClaimDetail {
  return {
    ...toClaimSummary(row),
    description: row.description,
    details: jsonToObject(row.details),
    files,
    notes,
  };
}

export function toClaimFile(row: FileRow): ClaimFile {
  return {
    id: row.id,
    claim_id: row.claim_id,
    uploaded_by: row.uploaded_by,
    storage_path: row.storage_path,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
  };
}

function toClaimNote(row: NoteRow): ClaimNote {
  return {
    id: row.id,
    claim_id: row.claim_id,
    author_id: row.author_id,
    body: row.body,
    visibility: row.visibility,
    created_at: row.created_at,
  };
}

// claims.details is CHECKed to be a JSON object (claims_details_is_object), so the non-object branches are
// unreachable; they exist only because the generated Json type cannot express the constraint.
export function jsonToObject(details: Json): Record<string, unknown> {
  if (
    typeof details === "object" &&
    details !== null &&
    !Array.isArray(details)
  ) {
    return details;
  }
  return {};
}
