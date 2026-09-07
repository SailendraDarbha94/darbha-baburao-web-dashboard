import "server-only";
import { Expo } from "expo-server-sdk";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

/**
 * Push to a claim's agent via Expo's push API (docs/PLAN.md decision i: tickets only).
 *
 * Callers run this inside Next's `after()`, so a slow or failed push never delays or fails the admin's
 * request. One message, one ticket; the ticket is the only thing inspected:
 *
 * - `DeviceNotRegistered` on the ticket → the token is dead; null it on the profile so we stop sending.
 * - Anything else (other error tickets, network errors, a thrown SDK error) → console.error and swallow.
 *
 * Why receipts are not polled: a ticket only says the message reached Expo; APNs/FCM-side rejections
 * (an uninstalled app, a rotated token) show up in Expo's *receipts* ~15 minutes later, which would need
 * somewhere to store ticket ids and something to drain them — a queue, which the brief rules out. The
 * cost is that a token that dies between app launches wastes one send before a ticket reports it dead
 * (the app re-registers its token on every launch, so this is self-healing). Opt-in upgrade: PLAN §6 q4.
 *
 * This is the ONLY module that imports lib/supabase/service.ts, and the null-out below is the ONLY
 * service-role write in the codebase (PLAN §2.4): it changes another user's expo_push_token, and profiles
 * deliberately has no admin UPDATE policy (it would expose `role`). The other cross-user token write —
 * clearing a newly registered token from other profiles — runs as the caller through the SECURITY DEFINER
 * function release_push_token() (see app/api/me/push-token/route.ts). The `eq("expo_push_token", token)`
 * guard on the null-out means a device that re-registered a fresh token between the send and this write is
 * left alone.
 *
 * Logging never includes the token itself: Expo's error messages embed it (e.g. "ExponentPushToken[…] is
 * not a registered push notification recipient"), and because Expo's push API needs no credentials unless
 * "Enhanced push security" is on, a token in the logs would let anyone with log access push to that phone.
 */
export async function sendClaimPush(input: {
  agentId: string;
  token: string | null;
  title: string;
  body: string;
  claimId: string;
}): Promise<void> {
  const { agentId, token, title, body, claimId } = input;
  // No token (never registered, or signed out) or not an Expo token at all: nothing to send.
  if (token === null || !Expo.isExpoPushToken(token)) return;

  let ticket;
  try {
    // Env is read here, not at module scope, so `next build` (no env) can import this file. An undefined
    // access token is fine: Expo only requires one when "Enhanced push security" is on for the project.
    const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    [ticket] = await expo.sendPushNotificationsAsync([
      { to: token, title, body, data: { claim_id: claimId }, sound: "default" },
    ]);
  } catch (error) {
    // Includes network failures and the SDK's own errors (e.g. an invalid access token).
    console.error("push: failed to send", {
      agentId,
      claimId,
      error: redactedMessage(error),
    });
    return;
  }

  if (ticket === undefined || ticket.status === "ok") return;

  if (ticket.details?.error !== "DeviceNotRegistered") {
    // Only the error code and a redacted message: `ticket.details` may carry the token verbatim.
    console.error("push: Expo rejected the message", {
      agentId,
      claimId,
      error: ticket.details?.error,
      message: redactToken(ticket.message),
    });
    return;
  }

  // The send itself is done; this is a separate failure mode. The most likely cause is
  // SUPABASE_SERVICE_ROLE_KEY not being set (createServiceSupabaseClient throws), which .env.example
  // documents as "the dead token is retried on every admin action" — say so, rather than reporting it as
  // a failed send.
  try {
    const { error } = await createServiceSupabaseClient()
      .from("profiles")
      .update({ expo_push_token: null })
      .eq("id", agentId)
      .eq("expo_push_token", token);
    if (error) throw error;
  } catch (error) {
    console.error(
      "push: could not null a DeviceNotRegistered token (SUPABASE_SERVICE_ROLE_KEY missing?)",
      { agentId, claimId, error: redactedMessage(error) },
    );
  }
}

/** Shorten free text for a notification body: first line-ish, at most `max` characters, "…" when cut. */
export function truncateForPush(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/** Replaces any Expo push token embedded in `text` (see the module comment on why). */
export function redactToken(text: string): string {
  return text.replace(
    /Expo(nent)?PushToken\[[^\]]*\]/g,
    "ExpoPushToken[redacted]",
  );
}

/** The message of an unknown thrown value, token-redacted. The stack is dropped on purpose (it can quote the body). */
function redactedMessage(error: unknown): string {
  return redactToken(error instanceof Error ? error.message : String(error));
}
