import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type Paginated,
} from "@claims/shared";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// fetch() wrapper for CLIENT components that call the /api/* route handlers (docs/PLAN.md decision a).
// Handlers are bearer-only (decision g), so the access token is read from the browser Supabase client and
// sent as `Authorization: Bearer`; the cookie session is never relied on. No retries: every admin
// mutation is a deliberate click, and the caller shows the error and lets the admin click again.

/** A non-2xx response, or a response that was not the expected JSON envelope. */
export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** z.flattenError() output on VALIDATION_ERROR; undefined otherwise. */
  readonly details: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type ApiFetchInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Serialised as JSON. */
  body?: unknown;
};

/**
 * Calls a route handler and returns its payload: `T` for a `{ data: T }` envelope, or the whole body when
 * it is a paginated list (`{ data, page, per_page, total }` is the top-level shape, not wrapped again).
 * Throws ApiClientError for `{ error }` bodies, a missing session, or a malformed response.
 */
export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await createBrowserSupabaseClient().auth.getSession();
  if (!session) {
    throw new ApiClientError(
      "UNAUTHENTICATED",
      "Your session has expired. Sign in again.",
      401,
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(path, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Not JSON (a proxy error page, an empty body): reported below with the HTTP status.
  }

  if (!response.ok) throw toClientError(body, response.status);

  if (isPaginated(body)) return body as T;
  if (isRecord(body) && "data" in body) return body.data as T;
  throw new ApiClientError(
    "INTERNAL",
    "Unexpected response from the server.",
    response.status,
  );
}

function toClientError(body: unknown, status: number): ApiClientError {
  if (isRecord(body) && isRecord(body.error)) {
    const { code, message, details } = body.error;
    return new ApiClientError(
      isApiErrorCode(code) ? code : "INTERNAL",
      typeof message === "string" && message
        ? message
        : `Request failed (${status}).`,
      status,
      details,
    );
  }
  return new ApiClientError("INTERNAL", `Request failed (${status}).`, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === "string" &&
    (API_ERROR_CODES as readonly string[]).includes(value)
  );
}

function isPaginated(value: unknown): value is Paginated<unknown> {
  return (
    isRecord(value) &&
    Array.isArray(value.data) &&
    typeof value.page === "number" &&
    typeof value.per_page === "number" &&
    typeof value.total === "number"
  );
}
