// Status workflow. Mirrors claims_guard_update in packages/supabase/migrations/20260902000002_claims.sql;
// change both together (the SQL carries the reverse comment). The route handlers reject invalid transitions
// with this table before touching the database; the trigger is the backstop for direct PostgREST callers.
//
//   draft → submitted → under_review → approved
//                                    → rejected
//                                    → info_requested → submitted
//
// "agent" means the claim's OWNER (whatever their role: an admin may sign in on mobile and submit a draft
// they authored); "admin" means an admin caller. The submit route always passes "agent"; admin routes "admin".
import {
  CLAIM_STATUSES,
  EDITABLE_STATUSES,
  type ClaimStatus,
} from "./constants";

export type TransitionActor = "agent" | "admin";

export const TRANSITIONS: Readonly<
  Record<
    TransitionActor,
    Readonly<Partial<Record<ClaimStatus, readonly ClaimStatus[]>>>
  >
> = {
  agent: {
    draft: ["submitted"],
    info_requested: ["submitted"],
  },
  admin: {
    submitted: ["under_review"],
    under_review: ["approved", "rejected", "info_requested"],
  },
};

/** Statuses `actor` may move a claim to from `from`. Empty when none. */
export function nextStatuses(
  from: ClaimStatus,
  actor: TransitionActor,
): readonly ClaimStatus[] {
  return TRANSITIONS[actor][from] ?? [];
}

export function canTransition(
  from: ClaimStatus,
  to: ClaimStatus,
  actor: TransitionActor,
): boolean {
  return nextStatuses(from, actor).includes(to);
}

/** Whether the owning agent may edit the claim's fields (PATCH /api/claims/:id). */
export function isEditable(status: ClaimStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function isClaimStatus(value: string): value is ClaimStatus {
  return (CLAIM_STATUSES as readonly string[]).includes(value);
}
