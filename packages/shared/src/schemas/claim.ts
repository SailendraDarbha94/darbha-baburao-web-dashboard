import { z } from "zod";
import { CLAIM_STATUSES } from "../constants";

// Extension point for structured fields the domain has not defined yet (brief: "details jsonb"). Deliberately a
// permissive record; tighten here (and only here) when fields are agreed. The DB only checks it is an object.
export const claimDetailsSchema = z.record(z.string(), z.unknown());

// Field rules mirror the CHECK constraints in packages/supabase/migrations/20260902000002_claims.sql.
const title = z.string().trim().min(1).max(200);
// Free text on purpose (docs/PLAN.md decision c): CLAIM_TYPES only populates the picker.
const claimType = z.string().trim().min(1).max(100);
const description = z.string().max(20000);
const incidentDate = z.iso.date();
const policyNumber = z.string().trim().max(100);
const claimantName = z.string().trim().max(200);

/** POST /api/claims. Drafts may be incomplete: only title and claim_type are required to create one. */
export const createClaimSchema = z.object({
  title,
  claim_type: claimType,
  description: description.default(""),
  incident_date: incidentDate.nullable().optional(),
  policy_number: policyNumber.nullable().optional(),
  claimant_name: claimantName.nullable().optional(),
  details: claimDetailsSchema.default({}),
});
export type CreateClaimInput = z.infer<typeof createClaimSchema>;

/** PATCH /api/claims/:id. Every field optional and WITHOUT defaults, so an omitted field is left untouched. */
export const updateClaimSchema = z.object({
  title: title.optional(),
  claim_type: claimType.optional(),
  description: description.optional(),
  incident_date: incidentDate.nullable().optional(),
  policy_number: policyNumber.nullable().optional(),
  claimant_name: claimantName.nullable().optional(),
  details: claimDetailsSchema.optional(),
});
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>;

/**
 * Run against the STORED claim row by POST /api/claims/:id/submit (docs/PLAN.md decision o): the structured fields
 * must be filled in before a claim leaves draft. App-enforced only; relaxing it is an edit here, not a migration.
 */
export const submittableClaimSchema = z.object({
  title: z.string().trim().min(1),
  claim_type: z.string().trim().min(1),
  incident_date: z.iso.date(),
  policy_number: z.string().trim().min(1),
  claimant_name: z.string().trim().min(1),
});

/** GET /api/claims query string. */
export const agentClaimsQuerySchema = z.object({
  status: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(CLAIM_STATUSES).optional(),
  ),
});
export type AgentClaimsQuery = z.infer<typeof agentClaimsQuerySchema>;
