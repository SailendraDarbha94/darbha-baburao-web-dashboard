import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_MIME_TYPES,
  CLAIM_EVENT_TYPES,
  CLAIM_STATUSES,
  EDITABLE_STATUSES,
  MAX_FILE_SIZE_BYTES,
  NOTE_VISIBILITIES,
  STORAGE_BUCKET,
  USER_ROLES,
} from "./constants";

describe("constants", () => {
  it("lists every workflow status exactly once", () => {
    expect(new Set(CLAIM_STATUSES).size).toBe(CLAIM_STATUSES.length);
    expect(CLAIM_STATUSES).toContain("draft");
    expect(CLAIM_STATUSES).toContain("info_requested");
  });

  it("only allows editing in draft and info_requested", () => {
    expect([...EDITABLE_STATUSES].sort()).toEqual(["draft", "info_requested"]);
  });

  it("caps files at 25 MiB", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(26214400);
  });
});

// The migrations carry the same lists as literals (enum values, CHECK constraints, the bucket row). Nothing at
// compile time relates CLAIM_EVENT_TYPES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES or STORAGE_BUCKET to the SQL
// (event_type is text + CHECK and is generated as `string`), so this test reads the migration files and compares.
// No database needed. A regex that stops matching throws, so a reformatted migration fails loudly.
const MIGRATIONS = new URL("../../supabase/migrations/", import.meta.url);
const sql = (name: string): string =>
  readFileSync(new URL(name, MIGRATIONS), "utf8");

const capture = (source: string, pattern: RegExp): string => {
  const match = pattern.exec(source);
  const captured = match?.[1];
  if (captured === undefined) {
    throw new Error(`pattern ${String(pattern)} did not match the migration`);
  }
  return captured;
};

/** Quoted SQL string literals inside `list`, in order. */
const literals = (list: string): string[] =>
  [...list.matchAll(/'([^']*)'/g)].map((m) => m[1] ?? "");

describe("constants mirror the migrations", () => {
  const profiles = sql("20260902000001_profiles.sql");
  const claims = sql("20260902000002_claims.sql");
  const bucket = sql("20260902000003_storage_bucket.sql");

  it("Postgres enums list the same values as the TS constants", () => {
    expect(
      literals(
        capture(
          profiles,
          /create type public\.user_role\s+as enum \(([^)]*)\)/,
        ),
      ),
    ).toEqual([...USER_ROLES]);
    expect(
      literals(
        capture(
          claims,
          /create type public\.claim_status\s+as enum \(([^)]*)\)/,
        ),
      ),
    ).toEqual([...CLAIM_STATUSES]);
    expect(
      literals(
        capture(
          claims,
          /create type public\.note_visibility\s+as enum \(([^)]*)\)/,
        ),
      ),
    ).toEqual([...NOTE_VISIBILITIES]);
  });

  it("claim_events_type CHECK lists exactly CLAIM_EVENT_TYPES", () => {
    expect(
      literals(
        capture(
          claims,
          /constraint claim_events_type check \(event_type in\s*\(([^)]*)\)\)/,
        ),
      ),
    ).toEqual([...CLAIM_EVENT_TYPES]);
  });

  it("claim_files_mime_allowed CHECK and the bucket allow-list equal ALLOWED_MIME_TYPES", () => {
    expect(
      literals(
        capture(
          claims,
          /constraint claim_files_mime_allowed\s+check \(mime_type in \(([^)]*)\)\)/,
        ),
      ),
    ).toEqual([...ALLOWED_MIME_TYPES]);
    expect(literals(capture(bucket, /array\[([^\]]*)\]/))).toEqual([
      ...ALLOWED_MIME_TYPES,
    ]);
  });

  it("claim_files_size CHECK and the bucket file_size_limit equal MAX_FILE_SIZE_BYTES", () => {
    expect(Number(capture(claims, /size_bytes <= (\d+)\)/))).toBe(
      MAX_FILE_SIZE_BYTES,
    );
    expect(
      Number(
        capture(bucket, /'claim-files',\s*'claim-files',\s*false,\s*(\d+),/),
      ),
    ).toBe(MAX_FILE_SIZE_BYTES);
  });

  it("the bucket id equals STORAGE_BUCKET", () => {
    expect(
      capture(
        bucket,
        /insert into storage\.buckets[^;]*?values \(\s*'([^']+)'/,
      ),
    ).toBe(STORAGE_BUCKET);
  });
});
