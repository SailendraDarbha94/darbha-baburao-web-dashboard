import * as Notifications from "expo-notifications";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getSupabaseEnv, SUPABASE_ENV_VARS } from "../lib/env";
// Importing lib/notifications here also installs the foreground notification handler at module load.
import { claimIdOf } from "../lib/notifications";
import { SessionProvider, useSession, type SessionState } from "../lib/session";

export default function RootLayout() {
  // Checked before anything touches Supabase so a missing .env produces a readable screen, not a crash.
  // Not a hook, so the early return is safe.
  if (!getSupabaseEnv()) {
    return <ConfigurationError />;
  }
  return (
    <SessionProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </SessionProvider>
  );
}

function RootNavigator() {
  const session = useSession();
  useNotificationTaps(session);

  // Until the persisted session has been read the guards below would evaluate to "signed out" and
  // flash the sign-in screen on every cold start. Expo Router keeps the launch URL, so a deep link
  // still lands on its route once the navigator mounts.
  if (session === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Stack.Protected removes the wrapped screens from the navigator while its guard is false, and
  // redirects to the first available screen if the user is currently on one of them. Signing in or out
  // therefore switches groups without any navigate() call.
  // "reset-password" sits outside both guards: the emailed link must open it whether or not a session
  // exists (exchangeCodeForSession creates one halfway through the flow).
  return (
    <Stack screenOptions={{ headerTitle: "Claims Agent" }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen
        name="reset-password"
        options={{ title: "Reset password" }}
      />
    </Stack>
  );
}

// Notification request identifiers that have already been recorded as a tap. The effect below re-runs on
// every session / segment change with the same `response` object, and this is what keeps that from turning
// one tap into a second navigation (or into a replay after a later sign-in). A ref would do the same job;
// module scope only spares the hook a ref. It does NOT survive Fast Refresh of this file (the module is
// re-evaluated) — clearLastNotificationResponse() below is what stops the native side from handing a
// consumed response back to a fresh mount.
const handledResponses = new Set<string>();

/**
 * Tapping a claim notification opens that claim (docs/PLAN.md decision s).
 *
 * useLastNotificationResponse() covers every case with one hook: the tap that launched the app from cold
 * (a response listener registered in an effect can miss it) and taps while the app is in the foreground
 * or background (the hook subscribes to those internally). The claim id is parked in a ref because two
 * things must be true before router.push is safe, and either can come after the tap:
 *   - the session has resolved to a Session — a tap while signed out is dropped rather than replayed
 *     after the next sign-in, which could be a different account;
 *   - the signed-in navigator is mounted. useSegments() is the reactive signal for that: it is backed by
 *     expo-router's route store, so this component re-renders when the "(app)" group mounts. (In expo-router
 *     57 useRootNavigationState() always returns a state and is read during render, so it cannot wake an
 *     effect on its own.)
 */
function useNotificationTaps(session: SessionState) {
  const router = useRouter();
  const segments = useSegments();
  const response = Notifications.useLastNotificationResponse();
  const pendingClaimId = useRef<string | null>(null);

  const inApp = segments[0] === "(app)";

  useEffect(() => {
    // 1. Record a new tap. Only the default action is a tap on the notification itself; the app defines
    //    no action buttons, so anything else is ignored. Each response is handled at most once.
    if (
      response &&
      response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const requestId = response.notification.request.identifier;
      if (!handledResponses.has(requestId)) {
        handledResponses.add(requestId);
        pendingClaimId.current = claimIdOf(response);
      }
    }

    // 2. Navigate once it is safe; otherwise wait for the next session / segment change.
    if (session === null) {
      pendingClaimId.current = null;
      return;
    }
    if (session === undefined || !inApp) {
      return;
    }
    const claimId = pendingClaimId.current;
    if (!claimId) {
      return;
    }
    pendingClaimId.current = null;
    router.push({ pathname: "/claims/[id]", params: { id: claimId } });
    // Drop the consumed response natively so a remount (Fast Refresh, or the next cold read) does not
    // see it again; the hook's own listener then reports null. Wrapped because the call throws an
    // UnavailabilityError where the native module lacks it (e.g. web), and losing this dedupe is not
    // worth crashing a navigation.
    try {
      Notifications.clearLastNotificationResponse();
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "[push] could not clear the last notification response",
          error,
        );
      }
    }
  }, [response, session, inApp, router]);
}

function ConfigurationError() {
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Supabase is not configured</Text>
      <Text style={styles.errorBody}>
        Set {SUPABASE_ENV_VARS.join(" and ")} in apps/mobile/.env (copy
        apps/mobile/.env.example), then restart the Expo dev server so the new
        values are bundled.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  errorBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#444",
  },
});
