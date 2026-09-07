import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * Non-blocking error strip with a Retry action. Screens render it above whatever they last loaded, so a
 * network failure never wipes the list or the detail the agent was looking at (brief: "handle the
 * network-error case gracefully").
 */
export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fef2f2",
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  message: { flex: 1, color: "#991b1b", fontSize: 14 },
  retry: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#b91c1c",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.6 },
  retryText: { color: "#b91c1c", fontWeight: "600" },
});
