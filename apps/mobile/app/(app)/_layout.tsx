import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { signOut } from "../../lib/auth";
import { registerForPushNotifications } from "../../lib/notifications";
import { useSession } from "../../lib/session";

// Signed-in area. Only reachable while the root layout's guard holds a session.
export default function AppLayout() {
  const session = useSession();
  const userId = session?.user.id;

  // Register the push token once per signed-in session: this layout mounts when the guard admits a
  // session and the effect re-runs only if a different account signs in on the same device. The promise
  // is dropped on purpose — registerForPushNotifications never throws and nothing here waits on it.
  useEffect(() => {
    if (userId) {
      void registerForPushNotifications();
    }
  }, [userId]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "My claims", headerRight: () => <SignOutButton /> }}
      />
      <Stack.Screen name="claims/new" options={{ title: "New claim" }} />
      <Stack.Screen name="claims/[id]/index" options={{ title: "Claim" }} />
      <Stack.Screen name="claims/[id]/edit" options={{ title: "Edit claim" }} />
    </Stack>
  );
}

function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    setBusy(true);
    const result = await signOut();
    // On success the root guard has already replaced this group with (auth); only the failure path
    // still has this button mounted.
    if (result.error) {
      Alert.alert("Could not sign out", result.error);
      setBusy(false);
    }
  }

  if (busy) {
    return <ActivityIndicator />;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void handlePress()}
      hitSlop={8}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={styles.text}>Sign out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { color: "#1d4ed8", fontSize: 16 },
  pressed: { opacity: 0.6 },
});
