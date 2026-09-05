import { registerPushToken } from "./claims";
import { requireSupabase } from "./supabase";

// How long sign-out waits for the push-token clear. A refused connection or DNS failure fails fast on its
// own; this covers an API that accepts the connection and never answers.
const CLEAR_PUSH_TOKEN_TIMEOUT_MS = 5000;

/**
 * Signs the current user out. The SessionProvider observes the resulting SIGNED_OUT event and the root
 * layout's route guard then moves the user to the sign-in screen; callers do not navigate themselves.
 */
export async function signOut(): Promise<{ error: string | null }> {
  // Clear this device's push token FIRST: POST /api/me/push-token needs the access token that
  // auth.signOut() is about to revoke, and a shared device must stop receiving the previous account's
  // claim notifications. Best effort only, and time-bounded — an unreachable API must not trap the user in
  // the app. This is not the only safeguard: the forced local sign-out on a dead session (lib/api.ts) has
  // no access token to clear with, so POST /api/me/push-token also takes a token away from every other
  // profile when the next account registers it. The cost of a failed clear is therefore only that the old
  // token stays on the profile until this device registers under another account, that account signs in
  // on some device (every registration replaces the stored token), or Expo reports it dead.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("push-token clear timed out")),
      CLEAR_PUSH_TOKEN_TIMEOUT_MS,
    );
  });
  try {
    // Promise.race keeps a handler on the loser, so a late rejection from the request is not unhandled.
    await Promise.race([registerPushToken(null), timedOut]);
  } catch (error) {
    if (__DEV__) {
      console.warn(
        "[push] could not clear the push token before sign-out",
        error,
      );
    }
  } finally {
    clearTimeout(timer);
  }
  const { error } = await requireSupabase().auth.signOut();
  return { error: error ? error.message : null };
}
