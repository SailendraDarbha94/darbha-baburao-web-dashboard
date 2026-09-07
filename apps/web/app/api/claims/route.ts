import {
  agentClaimsQuerySchema,
  createClaimSchema,
  type ClaimDetail,
} from "@claims/shared";
import type { Json } from "@claims/supabase/types";
import { requireUser } from "@/lib/api/auth";
import { ok, parseBody, parseQuery, route } from "@/lib/api/handler";
import { listAgentClaims, toClaimDetail } from "@/lib/queries/claims";

/** GET /api/claims?status= — the caller's own claims, updated_at desc, unpaginated (docs/PLAN.md §3). */
export const GET = route(async (request) => {
  const { user, db } = await requireUser(request);
  const query = parseQuery(
    request.nextUrl.searchParams,
    agentClaimsQuerySchema,
  );
  return ok(await listAgentClaims(db, user.id, query));
});

/** POST /api/claims — create a draft. Files and notes are always empty on a brand-new claim. */
export const POST = route(async (request) => {
  const { user, db } = await requireUser(request);
  const body = await parseBody(request, createClaimSchema);

  // Only the columns in the INSERT grant are sent: status and assigned_to are not insertable and take their
  // defaults ('draft', null); agent_id must be the caller (claims_insert_agent).
  const { data, error } = await db
    .from("claims")
    .insert({
      agent_id: user.id,
      title: body.title,
      claim_type: body.claim_type,
      description: body.description,
      incident_date: body.incident_date ?? null,
      policy_number: body.policy_number ?? null,
      claimant_name: body.claimant_name ?? null,
      details: toJson(body.details),
    })
    .select("*")
    .single();
  if (error) throw error;

  const detail: ClaimDetail = toClaimDetail(data, [], []);
  return ok(detail, 201);
});

// claimDetailsSchema is a permissive record (Record<string, unknown>), which TypeScript cannot prove to be
// Json. The value came out of request.json(), so it is JSON by construction; the cast records that.
function toJson(details: Record<string, unknown>): Json {
  return details as Json;
}
