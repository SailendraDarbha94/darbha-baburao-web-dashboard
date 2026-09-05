import type { ClaimStatus } from "@claims/shared";
import { StyleSheet, Text, View } from "react-native";

// One colour per workflow status. Labels are the enum values with underscores replaced, so a new status
// only needs a colour here (or falls back to grey).
const COLOURS: Record<ClaimStatus, { background: string; text: string }> = {
  draft: { background: "#e5e7eb", text: "#374151" },
  submitted: { background: "#dbeafe", text: "#1e40af" },
  under_review: { background: "#fef3c7", text: "#92400e" },
  approved: { background: "#dcfce7", text: "#166534" },
  rejected: { background: "#fee2e2", text: "#991b1b" },
  info_requested: { background: "#ffedd5", text: "#9a3412" },
};

export function statusLabel(status: ClaimStatus): string {
  return status.replace(/_/g, " ");
}

export function StatusBadge({ status }: { status: ClaimStatus }) {
  const colour = COLOURS[status];
  return (
    <View style={[styles.badge, { backgroundColor: colour.background }]}>
      <Text style={[styles.text, { color: colour.text }]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
});
