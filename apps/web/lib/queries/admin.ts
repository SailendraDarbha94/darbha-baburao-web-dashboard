import {
  CLAIM_EVENT_TYPES,
  CLAIM_STATUSES,
  type AdminClaimDetail,
  type AdminClaimSummary,
  type AdminClaimsQuery,
  type AgentWithCounts,
  type ClaimEvent,
  type ClaimEventType,
  type ClaimNote,
  type ClaimStatus,
  type Paginated,
  type ProfileRef,
} from "@claims/shared";
import type { Tables } from "@claims/supabase/types";
import type { Db } from "@/lib/db";
import {
  jsonToObject,
  listClaimFiles,
  toClaimDetail,
  type ClaimRow,
} from "@/lib/queries/claims";
import { signFileUrls } from "@/lib/storage";

// Admin-side reads (docs/PLAN.md decision b): shared by the /api/admin/* route handlers (bearer client) and
// the server-rendered dashboard pages (cookie client). The caller must be an admin; RLS (is_admin()) is what
// actually widens the reads, these functions add nothing to it.

type NoteRow = Tables<"claim_notes">;
type EventRow = Tables<"claim_events">;

/** Filtered, sorted, paginated claims with agent/assignee names (GET /api/admin/claims and the /claims page). */
export async function listAdminClaims(
  db: Db,
  query: AdminClaimsQuery,
): Promise<Paginated<AdminClaimSummary>> {
  const offset = (query.page - 1) * query.per_page;

  const { data, error, count } = await filteredClaims(db, query, false)
    .order(query.sort, { ascending: query.order === "asc" })
    // Deterministic pages when the sort column has ties (status, title).
    .order("id", { ascending: true })
    .range(offset, offset + query.per_page - 1);
  if (error) {
    // PostgREST answers 416 / PGRST103 when the offset is past the exact count (a stale link, or a filter
    // that now matches fewer rows). The contract (docs/PLAN.md §3) is an empty page with the real total, so
    // fetch the count alone rather than turning a legitimate page number into an error.
    if (error.code !== "PGRST103") throw error;
    const counted = await filteredClaims(db, query, true);
    if (counted.error) throw counted.error;
    return {
      data: [],
      page: query.page,
      per_page: query.per_page,
      total: counted.count ?? 0,
    };
  }

  const people = await profileRefs(db, data);
  return {
    data: data.map((row) => toAdminClaimSummary(row, people)),
    page: query.page,
    per_page: query.per_page,
    total: count ?? 0,
  };
}

/** The claims query with every list filter applied; `head` = count only, no rows. */
function filteredClaims(db: Db, query: AdminClaimsQuery, head: boolean) {
  let request = db.from("claims").select("*", { count: "exact", head });
  if (query.status) request = request.eq("status", query.status);
  if (query.assigned_to) request = request.eq("assigned_to", query.assigned_to);
  if (query.agent_id) request = request.eq("agent_id", query.agent_id);
  // Date range applies to created_at ([assumption] in the plan); `to` is inclusive of that whole day.
  if (query.from) request = request.gte("created_at", query.from);
  if (query.to) request = request.lt("created_at", dayAfter(query.to));
  return request;
}

/** One claim with everything the dashboard shows: people, files (signed URLs), all notes, the event timeline. */
export async function getAdminClaimDetail(
  db: Db,
  claimId: string,
): Promise<AdminClaimDetail | null> {
  const row = await getAdminClaimRow(db, claimId);
  if (!row) return null;
  return buildAdminClaimDetail(db, row);
}

/** Raw claim row by id (RLS: admins see every claim), or null. */
export async function getAdminClaimRow(
  db: Db,
  claimId: string,
): Promise<ClaimRow | null> {
  const { data, error } = await db
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** AdminClaimDetail for a row the caller already holds (after a status/assign write). */
export async function buildAdminClaimDetail(
  db: Db,
  row: ClaimRow,
): Promise<AdminClaimDetail> {
  const [files, notes, events, people] = await Promise.all([
    listClaimFiles(db, row.id),
    listAllClaimNotes(db, row.id),
    listClaimEvents(db, row.id),
    profileRefs(db, [row]),
  ]);
  const detail = toClaimDetail(row, await signFileUrls(db, files), notes);
  return {
    ...detail,
    agent: people.get(row.agent_id) ?? unknownProfile(row.agent_id),
    assignee: row.assigned_to
      ? (people.get(row.assigned_to) ?? unknownProfile(row.assigned_to))
      : null,
    events,
  };
}

/** Every note on a claim, oldest first. Under an admin client RLS returns both visibilities. */
export async function listAllClaimNotes(
  db: Db,
  claimId: string,
): Promise<ClaimNote[]> {
  const { data, error } = await db
    .from("claim_notes")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toClaimNote);
}

/** The audit timeline, in insertion order (bigint identity id, not the timestamp: see the migration). */
export async function listClaimEvents(
  db: Db,
  claimId: string,
): Promise<ClaimEvent[]> {
  const { data, error } = await db
    .from("claim_events")
    .select("*")
    .eq("claim_id", claimId)
    .order("id", { ascending: true });
  if (error) throw error;
  return data.map(toClaimEvent);
}

/** Agents (role = agent) as { id, full_name }, for the assignee/agent dropdowns; no counts, no claims scan. */
export async function listAgentRefs(db: Db): Promise<ProfileRef[]> {
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("role", "agent")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data.map((p) => ({ id: p.id, full_name: p.full_name }));
}

/** Agents (role = agent) with a claim count per status, for the /agents page and GET /api/admin/agents. */
export async function listAgentsWithCounts(db: Db): Promise<AgentWithCounts[]> {
  const [agents, claims] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "agent")
      .order("full_name", { ascending: true }),
    db.from("claims").select("agent_id, status"),
  ]);
  if (agents.error) throw agents.error;
  if (claims.error) throw claims.error;

  // Grouped here rather than in a DB view: one small query, nothing to migrate when the list changes.
  const countsByAgent = new Map<string, Record<ClaimStatus, number>>();
  for (const claim of claims.data) {
    const counts = countsByAgent.get(claim.agent_id) ?? emptyCounts();
    counts[claim.status] += 1;
    countsByAgent.set(claim.agent_id, counts);
  }

  return agents.data.map((agent) => {
    const counts = countsByAgent.get(agent.id) ?? emptyCounts();
    return {
      id: agent.id,
      full_name: agent.full_name,
      created_at: agent.created_at,
      counts,
      total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    };
  });
}

// ---------- helpers ----------

/** id → { id, full_name } for every agent/assignee referenced by the given claim rows (one lookup). */
async function profileRefs(
  db: Db,
  rows: ClaimRow[],
): Promise<Map<string, ProfileRef>> {
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.agent_id);
    if (row.assigned_to) ids.add(row.assigned_to);
  }
  return profileRefsById(db, [...ids]);
}

/**
 * id → { id, full_name } for arbitrary profile ids (event actors on the timeline, for example). Admins can
 * read every profile under RLS; an id RLS hides is simply absent from the map.
 */
export async function profileRefsById(
  db: Db,
  ids: readonly string[],
): Promise<Map<string, ProfileRef>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const { data, error } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, { id: p.id, full_name: p.full_name }]));
}

// A profile row that RLS hid or that no longer exists; the id is still shown so the record stays traceable.
function unknownProfile(id: string): ProfileRef {
  return { id, full_name: "Unknown user" };
}

function emptyCounts(): Record<ClaimStatus, number> {
  const counts = {} as Record<ClaimStatus, number>;
  for (const status of CLAIM_STATUSES) counts[status] = 0;
  return counts;
}

function dayAfter(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function toAdminClaimSummary(
  row: ClaimRow,
  people: Map<string, ProfileRef>,
): AdminClaimSummary {
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
    agent: people.get(row.agent_id) ?? unknownProfile(row.agent_id),
    assignee: row.assigned_to
      ? (people.get(row.assigned_to) ?? unknownProfile(row.assigned_to))
      : null,
  };
}

export function toClaimNote(row: NoteRow): ClaimNote {
  return {
    id: row.id,
    claim_id: row.claim_id,
    author_id: row.author_id,
    body: row.body,
    visibility: row.visibility,
    created_at: row.created_at,
  };
}

function toClaimEvent(row: EventRow): ClaimEvent {
  return {
    id: row.id,
    claim_id: row.claim_id,
    actor_id: row.actor_id,
    event_type: toEventType(row.event_type),
    payload: jsonToObject(row.payload),
    created_at: row.created_at,
  };
}

// event_type is text + CHECK in the DB (decision c), so the generated type is `string`; the CHECK guarantees
// membership, and the fallback keeps an unexpected value visible rather than dropping the event.
function toEventType(value: string): ClaimEventType {
  return (CLAIM_EVENT_TYPES as readonly string[]).includes(value)
    ? (value as ClaimEventType)
    : "updated";
}
