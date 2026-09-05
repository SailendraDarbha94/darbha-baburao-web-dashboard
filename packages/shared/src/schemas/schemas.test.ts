import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE_BYTES } from "../constants";
import {
  adminClaimsQuerySchema,
  assignClaimSchema,
  changeStatusSchema,
  createNoteSchema,
} from "./admin";
import {
  agentClaimsQuerySchema,
  createClaimSchema,
  submittableClaimSchema,
  updateClaimSchema,
} from "./claim";
import { createFileUploadSchema } from "./file";
import { passwordSchema } from "./auth";
import { pushTokenSchema } from "./me";

const UUID = "3f2b7a0e-6c1d-4e5f-8a9b-0c1d2e3f4a5b";

describe("createClaimSchema", () => {
  it("accepts a minimal draft and fills defaults", () => {
    const parsed = createClaimSchema.parse({
      title: "  Rear-ended at lights ",
      claim_type: "Motor",
    });
    expect(parsed).toEqual({
      title: "Rear-ended at lights",
      claim_type: "Motor",
      description: "",
      details: {},
    });
  });

  it("accepts the structured fields and a free-form details object", () => {
    const parsed = createClaimSchema.parse({
      title: "T",
      claim_type: "Anything goes",
      incident_date: "2026-08-30",
      policy_number: "POL-1",
      claimant_name: "A. Person",
      details: { vehicle: { reg: "AB12 CDE" }, witnesses: 2 },
    });
    expect(parsed.incident_date).toBe("2026-08-30");
    expect(parsed.details).toEqual({
      vehicle: { reg: "AB12 CDE" },
      witnesses: 2,
    });
  });

  it("rejects missing title, over-long fields, bad dates and non-object details", () => {
    expect(createClaimSchema.safeParse({ claim_type: "Motor" }).success).toBe(
      false,
    );
    expect(
      createClaimSchema.safeParse({ title: "   ", claim_type: "Motor" })
        .success,
    ).toBe(false);
    expect(
      createClaimSchema.safeParse({
        title: "x".repeat(201),
        claim_type: "Motor",
      }).success,
    ).toBe(false);
    expect(
      createClaimSchema.safeParse({
        title: "T",
        claim_type: "Motor",
        incident_date: "30/08/2026",
      }).success,
    ).toBe(false);
    expect(
      createClaimSchema.safeParse({
        title: "T",
        claim_type: "Motor",
        details: [],
      }).success,
    ).toBe(false);
  });

  // Each CHECK constraint cap in 20260902000002_claims.sql at N (accepted) and N + 1 (rejected), plus the
  // trim-before-min cases, so a change to either side of the mirror shows up here.
  const base = { title: "T", claim_type: "Motor" };
  it.each<[string, Record<string, unknown>, boolean]>([
    ["title at 200", { ...base, title: "x".repeat(200) }, true],
    ["title at 201", { ...base, title: "x".repeat(201) }, false],
    ["description at 20000", { ...base, description: "x".repeat(20000) }, true],
    [
      "description at 20001",
      { ...base, description: "x".repeat(20001) },
      false,
    ],
    ["claim_type empty", { ...base, claim_type: "" }, false],
    ["claim_type whitespace", { ...base, claim_type: "   " }, false],
    ["claim_type at 100", { ...base, claim_type: "x".repeat(100) }, true],
    ["claim_type at 101", { ...base, claim_type: "x".repeat(101) }, false],
    ["policy_number at 100", { ...base, policy_number: "x".repeat(100) }, true],
    [
      "policy_number at 101",
      { ...base, policy_number: "x".repeat(101) },
      false,
    ],
    ["claimant_name at 200", { ...base, claimant_name: "x".repeat(200) }, true],
    [
      "claimant_name at 201",
      { ...base, claimant_name: "x".repeat(201) },
      false,
    ],
    ["incident_date ISO", { ...base, incident_date: "2026-02-28" }, true],
    ["incident_date null", { ...base, incident_date: null }, true],
    [
      "incident_date datetime",
      { ...base, incident_date: "2026-02-28T00:00:00Z" },
      false,
    ],
    [
      "incident_date impossible",
      { ...base, incident_date: "2026-02-30" },
      false,
    ],
    ["details null", { ...base, details: null }, false],
    ["details string", { ...base, details: "{}" }, false],
  ])("%s -> %s", (_label, input, ok) => {
    expect(createClaimSchema.safeParse(input).success).toBe(ok);
  });
});

describe("updateClaimSchema", () => {
  it("does not materialise defaults for omitted fields", () => {
    expect(updateClaimSchema.parse({})).toEqual({});
  });

  it("allows clearing nullable fields and never accepts status", () => {
    expect(updateClaimSchema.parse({ policy_number: null })).toEqual({
      policy_number: null,
    });
    expect(updateClaimSchema.parse({ status: "approved" })).toEqual({});
  });
});

describe("submittableClaimSchema", () => {
  const complete = {
    title: "T",
    claim_type: "Motor",
    incident_date: "2026-08-30",
    policy_number: "POL-1",
    claimant_name: "A. Person",
  };

  it("accepts a complete row and reports every missing field at once", () => {
    expect(
      submittableClaimSchema.safeParse({
        ...complete,
        id: UUID,
        status: "draft",
      }).success,
    ).toBe(true);
    const result = submittableClaimSchema.safeParse({
      ...complete,
      incident_date: null,
      claimant_name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.sort()).toEqual(["claimant_name", "incident_date"]);
    }
  });
});

describe("agentClaimsQuerySchema", () => {
  it("treats an empty status as no filter and rejects unknown statuses", () => {
    expect(agentClaimsQuerySchema.parse({ status: "" })).toEqual({});
    expect(agentClaimsQuerySchema.parse({ status: "draft" })).toEqual({
      status: "draft",
    });
    expect(agentClaimsQuerySchema.safeParse({ status: "open" }).success).toBe(
      false,
    );
  });
});

describe("createFileUploadSchema", () => {
  it("accepts allowed types within the size cap", () => {
    expect(
      createFileUploadSchema.parse({
        file_name: "photo.jpg",
        mime_type: "image/jpeg",
        size_bytes: 1024,
      }),
    ).toEqual({
      file_name: "photo.jpg",
      mime_type: "image/jpeg",
      size_bytes: 1024,
    });
  });

  it("rejects disallowed types, zero/negative and oversize files", () => {
    const base = { file_name: "f", mime_type: "image/jpeg" as const };
    expect(
      createFileUploadSchema.safeParse({
        ...base,
        mime_type: "image/gif",
        size_bytes: 1,
      }).success,
    ).toBe(false);
    expect(
      createFileUploadSchema.safeParse({ ...base, size_bytes: 0 }).success,
    ).toBe(false);
    expect(
      createFileUploadSchema.safeParse({ ...base, size_bytes: -5 }).success,
    ).toBe(false);
    expect(
      createFileUploadSchema.safeParse({ ...base, size_bytes: 1.5 }).success,
    ).toBe(false);
    expect(
      createFileUploadSchema.safeParse({
        ...base,
        size_bytes: MAX_FILE_SIZE_BYTES,
      }).success,
    ).toBe(true);
    expect(
      createFileUploadSchema.safeParse({
        ...base,
        size_bytes: MAX_FILE_SIZE_BYTES + 1,
      }).success,
    ).toBe(false);
  });

  it.each<[string, Record<string, unknown>, boolean]>([
    ["file_name empty", { file_name: "" }, false],
    ["file_name whitespace", { file_name: "   " }, false],
    ["file_name at 255", { file_name: "x".repeat(255) }, true],
    ["file_name at 256", { file_name: "x".repeat(256) }, false],
    ["mime_type missing", { mime_type: undefined }, false],
    ["size_bytes as string", { size_bytes: "1024" }, false],
  ])("%s -> %s", (_label, override, ok) => {
    const input = {
      file_name: "photo.jpg",
      mime_type: "image/png",
      size_bytes: 1024,
      ...override,
    };
    expect(createFileUploadSchema.safeParse(input).success).toBe(ok);
  });
});

describe("adminClaimsQuerySchema", () => {
  it("applies defaults to an empty query and coerces numbers from strings", () => {
    expect(adminClaimsQuerySchema.parse({})).toEqual({
      sort: "created_at",
      order: "desc",
      page: 1,
      per_page: 25,
    });
    const parsed = adminClaimsQuerySchema.parse({
      status: "under_review",
      assigned_to: UUID,
      agent_id: "",
      from: "2026-01-01",
      to: "",
      sort: "title",
      order: "asc",
      page: "3",
      per_page: "50",
    });
    expect(parsed).toEqual({
      status: "under_review",
      assigned_to: UUID,
      from: "2026-01-01",
      sort: "title",
      order: "asc",
      page: 3,
      per_page: 50,
    });
  });

  it("rejects bad uuids, page 0, per_page over 100 and unknown sort fields", () => {
    expect(
      adminClaimsQuerySchema.safeParse({ assigned_to: "not-a-uuid" }).success,
    ).toBe(false);
    expect(adminClaimsQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(adminClaimsQuerySchema.safeParse({ per_page: "101" }).success).toBe(
      false,
    );
    expect(adminClaimsQuerySchema.safeParse({ sort: "agent" }).success).toBe(
      false,
    );
  });

  // Query-string edge cases: everything arrives as a string, so the coercions are where zod 4 is easiest to
  // get wrong (NaN from a non-numeric page, a float per_page, a non-ISO date).
  it.each<[string, Record<string, unknown>, boolean]>([
    ["from non-ISO", { from: "01/01/2026" }, false],
    ["to datetime", { to: "2026-01-01T00:00:00Z" }, false],
    ["from ISO", { from: "2026-01-01" }, true],
    ["page non-numeric", { page: "abc" }, false],
    ["page float", { page: "1.5" }, false],
    ["page negative", { page: "-1" }, false],
    ["per_page float", { per_page: "1.5" }, false],
    ["per_page zero", { per_page: "0" }, false],
    ["per_page at 100", { per_page: "100" }, true],
    ["order invalid", { order: "up" }, false],
    ["order empty means default", { order: "" }, true],
    ["agent_id bad uuid", { agent_id: "x" }, false],
    ["status unknown", { status: "open" }, false],
  ])("%s -> %s", (_label, input, ok) => {
    expect(adminClaimsQuerySchema.safeParse(input).success).toBe(ok);
  });
});

describe("changeStatusSchema", () => {
  it("accepts a status with or without a message and drops an empty message", () => {
    expect(changeStatusSchema.parse({ status: "under_review" })).toEqual({
      status: "under_review",
    });
    expect(
      changeStatusSchema.parse({
        status: "info_requested",
        message: "  Send the invoice  ",
      }),
    ).toEqual({
      status: "info_requested",
      message: "Send the invoice",
    });
    expect(
      changeStatusSchema.parse({ status: "approved", message: "   " }),
    ).toEqual({ status: "approved" });
  });

  it("rejects unknown statuses and caps the message at the note body length", () => {
    expect(changeStatusSchema.safeParse({ status: "done" }).success).toBe(
      false,
    );
    expect(
      changeStatusSchema.safeParse({
        status: "approved",
        message: "x".repeat(10000),
      }).success,
    ).toBe(true);
    expect(
      changeStatusSchema.safeParse({
        status: "approved",
        message: "x".repeat(10001),
      }).success,
    ).toBe(false);
  });
});

describe("assignClaimSchema", () => {
  it("accepts a uuid or null and rejects anything else", () => {
    expect(assignClaimSchema.parse({ assigned_to: UUID })).toEqual({
      assigned_to: UUID,
    });
    expect(assignClaimSchema.parse({ assigned_to: null })).toEqual({
      assigned_to: null,
    });
    expect(assignClaimSchema.safeParse({ assigned_to: "me" }).success).toBe(
      false,
    );
    expect(assignClaimSchema.safeParse({}).success).toBe(false);
  });
});

describe("createNoteSchema", () => {
  it("requires a body and a known visibility", () => {
    expect(
      createNoteSchema.parse({ body: " Hello ", visibility: "internal" }),
    ).toEqual({
      body: "Hello",
      visibility: "internal",
    });
    expect(
      createNoteSchema.safeParse({ body: "", visibility: "internal" }).success,
    ).toBe(false);
    expect(
      createNoteSchema.safeParse({ body: "x", visibility: "public" }).success,
    ).toBe(false);
  });

  it.each<[string, Record<string, unknown>, boolean]>([
    ["body whitespace", { body: "   " }, false],
    ["body at 10000", { body: "x".repeat(10000) }, true],
    ["body at 10001", { body: "x".repeat(10001) }, false],
    ["visibility missing", { visibility: undefined }, false],
    ["visibility agent_visible", { visibility: "agent_visible" }, true],
  ])("%s -> %s", (_label, override, ok) => {
    const input = { body: "Hello", visibility: "internal", ...override };
    expect(createNoteSchema.safeParse(input).success).toBe(ok);
  });
});

describe("pushTokenSchema", () => {
  it("accepts Expo push tokens or null and rejects other strings", () => {
    expect(
      pushTokenSchema.parse({
        expo_push_token: "ExponentPushToken[abc123-XYZ]",
      }),
    ).toEqual({
      expo_push_token: "ExponentPushToken[abc123-XYZ]",
    });
    expect(
      pushTokenSchema.parse({ expo_push_token: "ExpoPushToken[abc]" })
        .expo_push_token,
    ).toBe("ExpoPushToken[abc]");
    expect(pushTokenSchema.parse({ expo_push_token: null })).toEqual({
      expo_push_token: null,
    });
    expect(pushTokenSchema.safeParse({ expo_push_token: "abc" }).success).toBe(
      false,
    );
    expect(
      pushTokenSchema.safeParse({ expo_push_token: "ExponentPushToken[]" })
        .success,
    ).toBe(false);
    expect(pushTokenSchema.safeParse({}).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("mirrors the dashboard's minimum length of 8 and nothing else", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
    expect(passwordSchema.safeParse("        ").success).toBe(true);
    expect(passwordSchema.safeParse(12345678).success).toBe(false);
    const short = passwordSchema.safeParse("abc");
    expect(short.success).toBe(false);
    if (!short.success) {
      expect(short.error.issues[0]?.message).toBe("Use at least 8 characters.");
    }
  });
});
