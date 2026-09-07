import {
  CLAIM_EVENT_TYPES,
  CLAIM_STATUSES,
  CLAIM_TYPES,
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

// ---------- dashboard overview ----------

/** How many weekly buckets the "created over time" chart covers. */
const DASHBOARD_WEEKS = 12;

/**
 * Upper bound on the rows the aggregates are built from. PostgREST also applies the project's own
 * `max-rows` cap (1000 by default), so the real sample can be smaller; `sampled` vs `total` says so.
 */
const DASHBOARD_ROW_LIMIT = 2000;

/**
 * How many free-form claim_type values outside CLAIM_TYPES get a bar of their own before the rest are
 * grouped. claim_type is deliberately un-CHECKed text (see the migration and decision c), so without a cap
 * one typo per agent is one more bar and the chart degrades into hairlines.
 */
const DASHBOARD_EXTRA_TYPES = 6;

/** CLAIM_TYPES as a lookup, for telling a picker value apart from a free-form one. */
const KNOWN_TYPES: ReadonlySet<string> = new Set<string>(CLAIM_TYPES);

/** Everything the overview page at "/" renders, already grouped. */
export type DashboardMetrics = {
  /** Exact number of claims the caller can see, from the response's count header (never truncated). */
  total: number;
  /** How many rows the aggregates below were built from; less than `total` when the read was capped. */
  sampled: number;
  /** Every status in CLAIM_STATUSES, including the ones with no claims. */
  byStatus: Record<ClaimStatus, number>;
  /**
   * Every value in CLAIM_TYPES, then the DASHBOARD_EXTRA_TYPES most common free-form values, then one
   * "Other (n types)" bucket if anything was left over.
   */
  byType: { type: string; count: number }[];
  /** How many distinct free-form types the "Other" bucket folds together; 0 when there is no bucket. */
  otherTypes: number;
  /** Agents that own at least one claim in the sample, busiest first. */
  byAgent: {
    id: string;
    /**
     * profiles.full_name exactly as stored, so a real profile with a blank name stays blank (the same
     * choice toAdminClaimSummary makes); "Unknown user" means RLS hid the embed or the row is gone.
     * Callers that need a non-empty, unique axis label must supply the fallback themselves.
     */
    name: string;
    total: number;
    counts: Record<ClaimStatus, number>;
  }[];
  /** One bucket per ISO week, oldest first; `start` is that week's Monday as "YYYY-MM-DD" (UTC). */
  createdByWeek: { start: string; count: number }[];
  /**
   * Newest claims.updated_at among the `sampled` rows, or null when there are no claims. Because the
   * sample is ordered by created_at, an old claim touched today can fall outside it — callers must say
   * "among the most recent claims" whenever `sampled` is less than `total`.
   */
  lastActivityAt: string | null;
};

/**
 * Aggregates for the dashboard overview (the "/" page). One read: the claim columns the charts need plus
 * the owning agent's name as an embedded resource, then every grouping is done here in TypeScript. The
 * page must not fan out into one query per status — that is six round trips to a remote Supabase region
 * for six integers.
 *
 * At scale (tens of thousands of claims) this becomes a SQL view or an RPC that returns the counts
 * already grouped; today it is one small read and the honest cost is the row cap described above.
 */
export async function getDashboardMetrics(db: Db): Promise<DashboardMetrics> {
  const { data, error, count } = await db
    .from("claims")
    .select(
      "status, claim_type, agent_id, created_at, updated_at, agent:profiles!claims_agent_id_fkey(full_name)",
      { count: "exact" },
    )
    // Newest first, so a capped read samples the rows an admin is most likely to care about.
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_ROW_LIMIT);
  if (error) throw error;

  const byStatus = emptyCounts();
  const byTypeCounts = new Map<string, number>();
  for (const type of CLAIM_TYPES) byTypeCounts.set(type, 0);
  const byAgent = new Map<
    string,
    {
      id: string;
      name: string;
      total: number;
      counts: Record<ClaimStatus, number>;
    }
  >();
  const createdByWeek = lastWeekStarts(new Date());
  let lastActivityAt: string | null = null;

  for (const row of data) {
    byStatus[row.status] += 1;

    byTypeCounts.set(
      row.claim_type,
      (byTypeCounts.get(row.claim_type) ?? 0) + 1,
    );

    const agent = byAgent.get(row.agent_id) ?? {
      id: row.agent_id,
      name:
        embeddedFullName(row.agent) ?? unknownProfile(row.agent_id).full_name,
      total: 0,
      counts: emptyCounts(),
    };
    agent.total += 1;
    agent.counts[row.status] += 1;
    byAgent.set(row.agent_id, agent);

    // Claims older than the window simply fall outside every bucket.
    const week = weekStart(row.created_at);
    const bucketed = createdByWeek.get(week);
    if (bucketed !== undefined) createdByWeek.set(week, bucketed + 1);

    if (lastActivityAt === null || row.updated_at > lastActivityAt) {
      lastActivityAt = row.updated_at;
    }
  }

  const { types, otherTypes } = summariseTypes(byTypeCounts);

  return {
    total: count ?? data.length,
    sampled: data.length,
    byStatus,
    byType: types,
    otherTypes,
    // Busiest agent first; ties keep a stable, readable order.
    byAgent: [...byAgent.values()].sort(
      (a, b) => b.total - a.total || a.name.localeCompare(b.name),
    ),
    createdByWeek: [...createdByWeek].map(([start, count_]) => ({
      start,
      count: count_,
    })),
    lastActivityAt,
  };
}

/**
 * The stored full_name of an embedded `profiles` row from a claims select, or null when there is no row
 * to read (RLS hid it, or the profile is gone). PostgREST returns one object for a many-to-one embed, but
 * the generated types have modelled it as an array in the past, so both shapes are accepted.
 *
 * A blank name is returned as "" rather than null: that is a readable profile that has no name — the
 * column is NOT NULL DEFAULT '' — and calling it unknown would be a different, wrong claim.
 */
function embeddedFullName(
  agent: { full_name: string } | { full_name: string }[] | null,
): string | null {
  if (agent === null) return null;
  return Array.isArray(agent) ? (agent[0]?.full_name ?? null) : agent.full_name;
}

/**
 * The bars for "Claims by type": the six picker values first, always and in CLAIM_TYPES order so the chart
 * is stable and a type with no claims still shows a 0, then the most common free-form values, then a
 * single bucket for the tail. Nothing is dropped — the tail's claims are counted in the bucket.
 */
function summariseTypes(counts: ReadonlyMap<string, number>): {
  types: { type: string; count: number }[];
  otherTypes: number;
} {
  const known = CLAIM_TYPES.map((type) => ({
    type: type as string,
    count: counts.get(type) ?? 0,
  }));
  // Busiest first, then alphabetically so ties do not reshuffle between renders.
  const extras = [...counts]
    .filter(([type]) => !KNOWN_TYPES.has(type))
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  const folded = extras.slice(DASHBOARD_EXTRA_TYPES);
  const types = [...known, ...extras.slice(0, DASHBOARD_EXTRA_TYPES)];
  if (folded.length > 0) {
    types.push({
      // The count in the label is why this cannot collide with a literal claim_type of "Other".
      type: `Other (${folded.length} types)`,
      count: folded.reduce((sum, entry) => sum + entry.count, 0),
    });
  }
  return { types, otherTypes: folded.length };
}

/** The Monday (UTC) of the week containing `value`, as "YYYY-MM-DD". */
function weekStart(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // getUTCDay() is 0 for Sunday; shift so Monday is 0.
  const offset = (date.getUTCDay() + 6) % 7;
  return isoDate(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - offset,
    ),
  );
}

/** The last DASHBOARD_WEEKS week-start dates ending with `now`'s week, oldest first, all counts zero. */
function lastWeekStarts(now: Date): Map<string, number> {
  const current = new Date(`${weekStart(now.toISOString())}T00:00:00Z`);
  const weeks = new Map<string, number>();
  for (let back = DASHBOARD_WEEKS - 1; back >= 0; back -= 1) {
    weeks.set(isoDate(current.getTime() - back * 7 * 24 * 60 * 60 * 1000), 0);
  }
  return weeks;
}

function isoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
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
