import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken } from "./claims";

// Push notifications on the mobile side (docs/PLAN.md decision s for the mobile choices, decision i for tickets only). Two jobs:
//   1. tell expo-notifications how to present a notification that arrives while the app is in the
//      foreground (module load, below — the root layout imports this module, so it runs before any
//      notification can be delivered to JS);
//   2. after sign-in, obtain this device's Expo push token and store it on the profile through
//      POST /api/me/push-token so the admin route handlers in apps/web can reach the agent.
// The web side sends { title, body, data: { claim_id } }; claimIdOf() reads that back on a tap.

// Without a handler, expo-notifications discards notifications that arrive while the app is open. Present
// them exactly like background ones so an agent reading another claim still sees the banner. No badge: the
// app never sets or clears a badge count, so it would only ever go stale.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for push and stores its Expo push token on the signed-in user's profile.
 *
 * Never throws and nothing waits on it: push is a convenience, so every failure path logs and returns.
 * Called once per signed-in session from app/(app)/_layout.tsx; every launch re-registers, which is how a
 * token that changed (or was nulled by the web side after DeviceNotRegistered) gets replaced.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    // Skipped on simulators and emulators per docs/PLAN.md §5 step 8 (push is tested on a physical device).
    // It is a choice, not an impossibility: iOS Simulators on Xcode 14+ and Android emulators with Google
    // Play services can receive push, so drop this guard if you want to test there.
    if (!Device.isDevice) {
      skip("not a physical device");
      return;
    }
    // Expo Go dropped remote push on Android in SDK 53 (iOS Expo Go still has it); the plan uses a
    // development build on both platforms (decision s), so Expo Go is skipped everywhere rather than
    // per platform. StoreClient means Expo Go itself: a development build (expo-dev-client) reports
    // "bare", a release build "standalone".
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      skip("running in Expo Go; use a development build");
      return;
    }
    const projectId = getEasProjectId();
    if (!projectId) {
      skip(
        "extra.eas.projectId is not set in app.config.ts (run `eas init` and paste the id in)",
      );
      return;
    }

    // Android 8+ shows a notification only through a channel. The Expo push service targets the channel
    // named "default" when the sender does not pick one (the web side does not), so create it before the
    // first notification arrives, with MAX importance for a heads-up banner. Repeating this on every launch
    // is harmless: once a channel exists, Android lets an app change only its name and description.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Claim updates",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    // Prompt only the first time. Once the user has answered, asking again on every launch would nag;
    // they can change their mind in the system settings.
    if (
      permission.status === Notifications.PermissionStatus.UNDETERMINED &&
      permission.canAskAgain
    ) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) {
      skip(`notification permission ${permission.status}`);
      return;
    }

    // Talks to Expo's servers; fails offline, hence the catch below. The next launch tries again.
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    await registerPushToken(token);
    if (__DEV__) {
      console.log(`[push] registered ${token}`);
    }
  } catch (error) {
    // Network failures (Expo's token endpoint, our API), a rejected token (VALIDATION_ERROR), or a
    // session that died mid-way (apiFetch signs out on a second 401). None of these should surface to the
    // agent; the claim screens keep working without push.
    console.warn("[push] registration failed", error);
  }
}

// Claim ids are uuids (claims.id). Anything else in a payload is dropped before it reaches the router.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The claim to open for a notification the user interacted with, or null when the payload carries no
 * uuid-shaped claim_id. The data object is whatever the sender put there — Expo's push API accepts
 * messages from anyone holding the token unless "Enhanced push security" is on — so nothing about its
 * shape is trusted.
 */
export function claimIdOf(
  response: Notifications.NotificationResponse,
): string | null {
  const data: unknown = response.notification.request.content.data;
  if (!isRecord(data)) {
    return null;
  }
  const claimId = data.claim_id;
  return typeof claimId === "string" && UUID.test(claimId) ? claimId : null;
}

/**
 * extra.eas.projectId from app.config.ts, with the EAS-provided fallback the Expo docs use. `extra` is
 * typed as `{ [k: string]: any }`, so it is read as unknown and narrowed instead of dotted through.
 */
function getEasProjectId(): string | null {
  const extra: unknown = Constants.expoConfig?.extra;
  const eas = isRecord(extra) ? extra.eas : undefined;
  const fromExtra = isRecord(eas) ? eas.projectId : undefined;
  const projectId = fromExtra ?? Constants.easConfig?.projectId;
  return typeof projectId === "string" && projectId.length > 0
    ? projectId
    : null;
}

function skip(reason: string): void {
  if (__DEV__) {
    console.log(`[push] registration skipped: ${reason}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
