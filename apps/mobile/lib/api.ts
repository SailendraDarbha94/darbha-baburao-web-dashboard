import type { ApiErrorBody, ApiErrorCode } from "@claims/shared";
import { getApiUrl } from "./env";
import { requireSupabase } from "./supabase";

// Thin client for the route handlers in apps/web (docs/PLAN.md §3). Plain fetch + per-screen useState,
// no caching library (decision s): one agent's claims are few and every screen reloads on focus.
//
// Every request: read the access token from the Supabase session, send it as a bearer, parse the
// `{ data }` / `{ error: { code, message, details } }` envelope. Two recovery paths, both here so that
// screens only ever see ApiError or NetworkError:
//   - 401 → refreshSession() once and retry; still 401 → sign out this device (the root guard then shows
//     sign-in) and rethrow with the server's own message.
//   - fetch() throws (no connectivity, DNS, server down) → for GET, two retries with a short backoff; then
//     NetworkError so the screen can offer "Retry" while keeping what it already shows.

/** A non-2xx response with the API's error envelope. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(args: {
    code: ApiErrorCode;
    message: string;
    status: number;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
  }
}

/** fetch() itself failed after retries: the request may or may not have reached the server. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Could not reach the server. Check your connection and try again.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export type ApiFetchInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON-encoded when present. */
  body?: unknown;
  /** Appended as a query string; undefined values are skipped. */
  query?: Record<string, string | undefined>;
};

// Attempts for a request whose fetch() threw: the first call plus two retries.
const NETWORK_ATTEMPTS = 3;
const NETWORK_BACKOFF_MS = [500, 1500] as const;

/**
 * Calls `EXPO_PUBLIC_API_URL + path` and returns the `data` of a 2xx response.
 * Throws ApiError (non-2xx) or NetworkError (unreachable); anything else is a programming error.
 */
export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const url = buildUrl(path, init.query);
  const token = await getAccessToken();

  let response = await fetchWithRetry(url, init, token);

  if (response.status === 401) {
    // The token may have expired between getSession() and the server's check, or been revoked. One
    // refresh attempt; a second 401 means the session is dead and the user must sign in again.
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetchWithRetry(url, init, refreshed);
    }
    if (response.status === 401 || !refreshed) {
      // scope "local" drops this device's session only. auth-js's default, "global", revokes the user's
      // refresh tokens on every device, which one dead session on one phone must not do.
      await requireSupabase().auth.signOut({ scope: "local" });
      throw new ApiError({
        code: "UNAUTHENTICATED",
        message:
          (await errorMessageOf(response)) ??
          "Your session has expired. Please sign in again.",
        status: 401,
      });
    }
  }

  return parseEnvelope<T>(response);
}

function buildUrl(
  path: string,
  query: Record<string, string | undefined> | undefined,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return `${getApiUrl()}${path}${qs ? `?${qs}` : ""}`;
}

/**
 * Reads the access token immediately before a request. auth-js refreshes an expired token inside
 * getSession(), which matters here because the auto-refresh ticker is stopped while the app is in the
 * background (lib/supabase.ts) and the first request after resuming would otherwise carry a stale JWT.
 */
async function getAccessToken(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new ApiError({
      code: "UNAUTHENTICATED",
      message: error?.message ?? "You are signed out.",
      status: 401,
    });
  }
  return token;
}

/** Forces a refresh; null when the refresh token is rejected (or there is no session). */
async function refreshAccessToken(): Promise<string | null> {
  const { data, error } = await requireSupabase().auth.refreshSession();
  if (error) {
    return null;
  }
  return data.session?.access_token ?? null;
}

async function fetchWithRetry(
  url: string,
  init: ApiFetchInit,
  token: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const request: RequestInit = {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  };

  // Only a thrown fetch() on a GET is retried. A thrown fetch does not prove the server never saw the
  // request (the connection can drop after the handler committed), so replaying a POST could create a
  // second draft or a second file reservation, and replaying a submit would be answered INVALID_TRANSITION
  // after it had in fact succeeded. Non-GET failures become NetworkError at once; the screens keep their
  // form state and offer Retry. A response, however unhappy, is never replayed.
  const attempts = request.method === "GET" ? NETWORK_ATTEMPTS : 1;

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await sleep(NETWORK_BACKOFF_MS[attempt - 1] ?? 1500);
    }
    try {
      return await fetch(url, request);
    } catch (error) {
      lastError = error;
    }
  }
  throw new NetworkError(lastError);
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // Not JSON: a proxy error page, or an empty body. Report the status so the message is at least honest.
    throw new ApiError({
      code: "INTERNAL",
      message: `Unexpected response from the server (HTTP ${response.status}).`,
      status: response.status,
    });
  }

  if (response.ok) {
    if (isRecord(body) && "data" in body) {
      return body.data as T;
    }
    throw new ApiError({
      code: "INTERNAL",
      message: "The server returned a response without data.",
      status: response.status,
    });
  }

  if (isApiErrorBody(body)) {
    throw new ApiError({
      code: body.error.code,
      message: body.error.message,
      status: response.status,
      details: body.error.details,
    });
  }
  throw new ApiError({
    code: "INTERNAL",
    message: `Request failed (HTTP ${response.status}).`,
    status: response.status,
  });
}

/** The `error.message` of an error envelope, or null when the body is not one (or not JSON). */
async function errorMessageOf(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    return isApiErrorBody(body) ? body.error.message : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }
  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Per-field messages from a VALIDATION_ERROR. `details` is z.flattenError() output
 * (`{ formErrors: string[], fieldErrors: Record<string, string[]> }`); anything else yields {}.
 */
export function fieldErrorsOf(error: ApiError): Record<string, string[]> {
  if (error.code !== "VALIDATION_ERROR" || !isRecord(error.details)) {
    return {};
  }
  const fieldErrors = error.details.fieldErrors;
  if (!isRecord(fieldErrors)) {
    return {};
  }
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter(
        (m): m is string => typeof m === "string",
      );
    }
  }
  return result;
}

/** Human-readable message for any error a screen may catch. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}
