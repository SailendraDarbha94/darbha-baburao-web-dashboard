// Compile-time guard that the Postgres enums (as generated into types.ts) and the TypeScript constants in
// @claims/shared list exactly the same values. If a migration adds an enum value without updating
// packages/shared (or vice versa), `pnpm typecheck` fails here instead of at runtime.
// Nothing imports this file; it only has to typecheck.
import type {
  CLAIM_STATUSES,
  NOTE_VISIBILITIES,
  USER_ROLES,
} from "@claims/shared";
import type { Enums } from "./types";

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type ClaimStatusMatches = Assert<
  Equal<Enums<"claim_status">, (typeof CLAIM_STATUSES)[number]>
>;
export type NoteVisibilityMatches = Assert<
  Equal<Enums<"note_visibility">, (typeof NOTE_VISIBILITIES)[number]>
>;
export type UserRoleMatches = Assert<
  Equal<Enums<"user_role">, (typeof USER_ROLES)[number]>
>;
