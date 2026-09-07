import { pushTokenSchema, type PushTokenResult } from "@claims/shared";
import { requireUser } from "@/lib/api/auth";
import { ok, parseBody, route } from "@/lib/api/handler";

/**
 * POST /api/me/push-token — store (or clear, with null) the caller's Expo push token on their profile.
 * Any authenticated user; everything runs as the caller. The UPDATE grant on profiles covers exactly
 * full_name and expo_push_token, and profiles_update_own limits it to the caller's row.
 */
export const POST = route(async (request) => {
  const { user, db } = await requireUser(request);
  const body = await parseBody(request, pushTokenSchema);

  if (body.expo_push_token !== null) {
    // One device, one account: take the token away from any other profile that still holds it (a previous
    // account on a shared phone whose sign-out never reached the API). Done first so there is no moment
    // where two profiles share a token. release_push_token() is SECURITY DEFINER (migration 5) because the
    // caller's own RLS cannot reach other rows; it is not a service-role write, so this route stays
    // user-scoped. A failure fails the request: storing the token anyway would leave the other account
    // receiving this device's pushes.
    const { error: releaseError } = await db.rpc("release_push_token", {
      p_token: body.expo_push_token,
    });
    if (releaseError) throw releaseError;
  }

  const { data, error } = await db
    .from("profiles")
    .update({ expo_push_token: body.expo_push_token })
    .eq("id", user.id)
    .select("expo_push_token")
    .single();
  if (error) throw error;

  const result: PushTokenResult = { expo_push_token: data.expo_push_token };
  return ok(result);
});
