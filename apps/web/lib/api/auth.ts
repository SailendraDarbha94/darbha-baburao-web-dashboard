import { isAuthRetryableFetchError, type User } from "@supabase/supabase-js";
import {
  createBearerClient,
  type BearerSupabaseClient,
} from "@claims/supabase/bearer";
import type { Tables } from "@claims/supabase/types";
import { ApiError, internalError } from "@/lib/api/errors";
import { getPublicSupabaseEnv } from "@/lib/env";

export type AuthedRequest = {
  user: User;
  profile: Tables<"profiles">;
  /** Client acting as the caller: RLS applies and auth.uid() in the audit triggers is the caller. */
  db: BearerSupabaseClient;
};

/**
 * Route-handler authentication (docs/PLAN.md §3 "Authentication in every handler", decision g). Bearer
 * tokens only — cookies are never read here, so there is no CSRF surface and one auth path for mobile and
 * the dashboard's client components alike.
 *
 * 1. `Authorization: Bearer <jwt>`; missing → UNAUTHENTICATED.
 * 2. A bearer client with that token; `auth.getUser(token)` verifies it with the Auth server (a decoded but
 *    unverified JWT is never trusted). Invalid or expired → UNAUTHENTICATED. Auth server unreachable →
 *    INTERNAL: the token was never checked, and a 401 would make the mobile client sign the user out.
 * 3. Own profiles row through the same client (RLS: profiles_select_own). No row → FORBIDDEN, not
 *    UNAUTHENTICATED: the session is valid, so the client must not treat it as expired.
 */
export async function requireUser(request: Request): Promise<AuthedRequest> {
  const accessToken = bearerToken(request.headers.get("authorization"));
  if (!accessToken) {
    throw new ApiError(
      "UNAUTHENTICATED",
      "Missing bearer token. Send Authorization: Bearer <access token>.",
    );
  }

  // Env is read per request, never at module scope, so `next build` succeeds with no env set.
  const { url, publishableKey } = getPublicSupabaseEnv();
  const db = createBearerClient({ url, publishableKey, accessToken });

  const {
    data: { user },
    error,
  } = await db.auth.getUser(accessToken);
  if (error && isAuthRetryableFetchError(error)) {
    // fetch() to the Auth server threw (outage, DNS, a mis-set NEXT_PUBLIC_SUPABASE_URL on this host):
    // nothing is known about the token. Reported as a server error so clients retry instead of signing out.
    console.error("[api] auth server unreachable", error);
    throw internalError();
  }
  if (error || !user) {
    throw new ApiError("UNAUTHENTICATED", "Invalid or expired access token.");
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    // The on_auth_user_created trigger did not run for this user (migration applied after sign-up). The
    // mobile client signs out on a persistent 401, which would hide this message behind a sign-in loop;
    // 403 keeps the session and shows the text.
    throw new ApiError(
      "FORBIDDEN",
      "No profile exists for this account. Contact an administrator.",
    );
  }

  return { user, profile, db };
}

/** requireUser + admin role. For /api/admin/*; the DB re-checks via is_admin() regardless. */
export async function requireAdmin(request: Request): Promise<AuthedRequest> {
  const auth = await requireUser(request);
  if (auth.profile.role !== "admin") {
    throw new ApiError("FORBIDDEN", "Administrator access is required.");
  }
  return auth;
}

function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return null;
  const token = rest.join("");
  return token.length > 0 ? token : null;
}
