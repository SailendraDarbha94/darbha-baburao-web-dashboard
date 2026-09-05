import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { ApiErrorBody, Ok } from "@claims/shared";
import {
  ApiError,
  fromPostgrestError,
  internalError,
  isPostgrestError,
} from "@/lib/api/errors";

/** Success envelope: `{ data }` (docs/PLAN.md §3). 201 for creates. */
export function ok<T>(data: T, status = 200): NextResponse<Ok<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * Wraps a route handler so that every failure becomes the one error envelope:
 *   ApiError        → its status,        { error: { code, message, details? } }
 *   ZodError        → 400 VALIDATION_ERROR with details = z.flattenError(err) (per-field errors for forms)
 *   PostgrestError  → lib/api/errors.ts fromPostgrestError()
 *   anything else   → 500 INTERNAL, logged server-side, generic message
 *
 * `Ctx` is whatever Next passes as the second argument: `{ params: Promise<{ id: string }> }` for dynamic
 * segments, and an argument the handler ignores otherwise.
 */
export function route<Ctx>(
  fn: (request: NextRequest, ctx: Ctx) => Promise<Response>,
): (request: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (request, ctx) => {
    try {
      return await fn(request, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  const apiError = toApiError(error);
  const body: ApiErrorBody = {
    error: { code: apiError.code, message: apiError.message },
  };
  if (apiError.details !== undefined) body.error.details = apiError.details;
  return NextResponse.json(body, { status: apiError.status });
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof z.ZodError) {
    return new ApiError(
      "VALIDATION_ERROR",
      "The request is invalid.",
      z.flattenError(error),
    );
  }
  if (isPostgrestError(error)) return fromPostgrestError(error);
  // Storage errors, a missing env var, a network failure: nothing a client can act on.
  console.error("[api] unhandled error", error);
  return internalError();
}

/** The request body as JSON. A missing or malformed body is a VALIDATION_ERROR, not a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new ApiError(
      "VALIDATION_ERROR",
      "The request body must be valid JSON.",
    );
  }
}

/** JSON body parsed with a shared zod schema. Failures surface through route() as VALIDATION_ERROR. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  return schema.parse(await readJsonBody(request));
}

/** Query string parsed with a shared zod schema. A repeated key keeps its last value. */
export function parseQuery<S extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: S,
): z.output<S> {
  return schema.parse(Object.fromEntries(searchParams));
}
