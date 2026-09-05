import { describe, expect, it } from "vitest";
import { CLAIM_STATUSES, type ClaimStatus } from "./constants";
import {
  canTransition,
  isEditable,
  nextStatuses,
  type TransitionActor,
} from "./transitions";

// Written out by hand, NOT derived from TRANSITIONS, so the test checks the table against the brief's diagram
// rather than against itself. Must stay identical to claims_guard_update in
// packages/supabase/migrations/20260902000002_claims.sql.
const ALLOWED: ReadonlyArray<[ClaimStatus, ClaimStatus, TransitionActor]> = [
  ["draft", "submitted", "agent"],
  ["info_requested", "submitted", "agent"],
  ["submitted", "under_review", "admin"],
  ["under_review", "approved", "admin"],
  ["under_review", "rejected", "admin"],
  ["under_review", "info_requested", "admin"],
];

const ACTORS: readonly TransitionActor[] = ["agent", "admin"];

describe("canTransition", () => {
  it("covers every (from, to, actor) triple exactly as the workflow diagram allows", () => {
    let checked = 0;
    for (const from of CLAIM_STATUSES) {
      for (const to of CLAIM_STATUSES) {
        for (const actor of ACTORS) {
          const expected = ALLOWED.some(
            ([f, t, a]) => f === from && t === to && a === actor,
          );
          expect(
            canTransition(from, to, actor),
            `${actor}: ${from} -> ${to}`,
          ).toBe(expected);
          checked++;
        }
      }
    }
    expect(checked).toBe(
      CLAIM_STATUSES.length * CLAIM_STATUSES.length * ACTORS.length,
    ); // 72
  });

  it("never allows a self-transition or a move out of a terminal status", () => {
    for (const status of CLAIM_STATUSES) {
      for (const actor of ACTORS) {
        expect(canTransition(status, status, actor)).toBe(false);
      }
    }
    for (const terminal of ["approved", "rejected"] as const) {
      for (const actor of ACTORS) {
        expect(nextStatuses(terminal, actor)).toEqual([]);
      }
    }
  });
});

describe("nextStatuses", () => {
  it("lists the allowed targets per actor", () => {
    expect(nextStatuses("draft", "agent")).toEqual(["submitted"]);
    expect(nextStatuses("draft", "admin")).toEqual([]);
    expect(nextStatuses("submitted", "admin")).toEqual(["under_review"]);
    expect(nextStatuses("submitted", "agent")).toEqual([]);
    expect(nextStatuses("under_review", "admin")).toEqual([
      "approved",
      "rejected",
      "info_requested",
    ]);
    expect(nextStatuses("info_requested", "agent")).toEqual(["submitted"]);
    expect(nextStatuses("info_requested", "admin")).toEqual([]);
  });
});

describe("isEditable", () => {
  it("is true only for draft and info_requested", () => {
    const editable = CLAIM_STATUSES.filter((s) => isEditable(s));
    expect(editable.sort()).toEqual(["draft", "info_requested"]);
  });
});
