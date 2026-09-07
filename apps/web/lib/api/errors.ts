import { PostgrestError } from "@supabase/supabase-js";
import type { ApiErrorCode } from "@claims/shared";

// API error code → HTTP status (docs/PLAN.md §3 "Response and error shape"). The codes themselves live in
// @claims/shared so mobile can switch on them.
const HTTP_STATUS_BY_CODE: Readonly<Record<ApiErrorCode, number>> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INVALID_TRANSITION: 409,
  INVALID_STATE: 409,
  FILE_TYPE_NOT_ALLOWED: 415,
  FILE_TOO_LARGE: 413,
  INTERNAL: 500,
};

/**
 * Thrown by handlers and helpers; lib/api/handler.ts turns it into `{ error: { code, message, details? } }`
 * with the status from the table above. `message` is shown to end users, so keep it free of internals.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = HTTP_STATUS_BY_CODE[code];
    if (details !== undefined) this.details = details;
  }
}

/**
 * The error object a PostgREST call resolves with. supabase-js only constructs a `PostgrestError` instance
 * on the `.throwOnError()` path; the `{ data, error }` result that the handlers `throw` carries the parsed
 * JSON body as a plain object, and PostgREST serialises an absent DETAIL / HINT as `null`
 * (`{ code: "CL001", details: null, hint: null, message: "..." }`). The class types `details` and `hint`
 * as `string`, so this looser shape is what fromPostgrestError() actually works with.
 */
export type PostgrestErrorLike = {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
};

export function isPostgrestError(error: unknown): error is PostgrestErrorLike {
  if (error instanceof PostgrestError) return true;
  if (typeof error !== "object" || error === null) return false;
  const e = error as Record<string, unknown>;
  return (
    typeof e.message === "string" &&
    typeof e.code === "string" &&
    (e.details === null || typeof e.details === "string") &&
    (e.hint === null || typeof e.hint === "string")
  );
}

export function fromPostgrestError(error: PostgrestErrorLike): ApiError {
  switch (error.code) {
    case "42501":
      return new ApiError(
        "FORBIDDEN",
        "You do not have permission to perform this action.",
      );
    case "PGRST116":
      return new ApiError("NOT_FOUND", "Not found.");
    // 416: a `.range()` offset past the exact count (offset > total). Only the paginated lists reach it.
    case "PGRST103":
      return new ApiError("VALIDATION_ERROR", "page is beyond the last page.");
    case "23514":
    case "22P02":
    case "23503":
      return new ApiError(
        "VALIDATION_ERROR",
        "The request contains invalid values.",
      );
    case "23505":
      return new ApiError(
        "INVALID_STATE",
        "The request conflicts with an existing record.",
      );
    case "CL001":
      return new ApiError(
        "INVALID_TRANSITION",
        "This status change is not allowed.",
      );
    case "CL002":
      return new ApiError(
        "FORBIDDEN",
        "You do not have permission to change that field.",
      );
    default:
      console.error("[api] unmapped PostgREST error", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return internalError();
  }
}

export function internalError(): ApiError {
  return new ApiError("INTERNAL", "Something went wrong. Please try again.");
}
