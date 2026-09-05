import {
  CLAIM_STATUSES,
  type ClaimStatus,
  type ClaimSummary,
} from "@claims/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorBanner } from "../../components/error-banner";
import { SubmitButton } from "../../components/form";
import { StatusBadge, statusLabel } from "../../components/status-badge";
import { errorMessage } from "../../lib/api";
import { listClaims } from "../../lib/claims";

// Own claims grouped by status, with a status filter. The filter is sent to GET /api/claims (the
// agentClaimsQuerySchema `status` query) rather than applied locally, so what the list shows is exactly
// what the server returned for that filter. Reloads whenever the screen gains focus (a submit or edit on
// the detail screen changes what belongs here) and on pull-to-refresh.

type Filter = ClaimStatus | "all";

type Section = { title: string; status: ClaimStatus; data: ClaimSummary[] };

export default function ClaimsListScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  // null until the first successful load; kept across failed reloads so the banner sits above real data.
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Every load is numbered so that a response for an earlier filter which arrives after a later one is
  // dropped rather than shown under the wrong chip.
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    latestLoad.current += 1;
    const thisLoad = latestLoad.current;
    try {
      const result = await listClaims(filter === "all" ? undefined : filter);
      if (thisLoad !== latestLoad.current) {
        return;
      }
      setClaims(result);
      setError(null);
    } catch (e) {
      if (thisLoad !== latestLoad.current) {
        return;
      }
      setError(errorMessage(e));
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const sections = groupByStatus(claims ?? []);

  return (
    <View style={styles.screen}>
      {error !== null ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        <FilterChip
          label="All"
          selected={filter === "all"}
          onPress={() => setFilter("all")}
        />
        {CLAIM_STATUSES.map((status) => (
          <FilterChip
            key={status}
            label={statusLabel(status)}
            selected={filter === status}
            onPress={() => setFilter(status)}
          />
        ))}
      </ScrollView>

      {claims === null && error === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>
              {statusLabel(section.status)} ({section.data.length})
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/claims/${item.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.claim_type} · updated {formatDate(item.updated_at)}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </Pressable>
          )}
          // Nothing was loaded yet when the first load fails: the banner above is the whole story then.
          ListEmptyComponent={
            claims === null ? null : (
              <Text style={styles.empty}>
                {filter === "all"
                  ? "No claims yet. Create your first one below."
                  : `No ${statusLabel(filter)} claims.`}
              </Text>
            )
          }
        />
      )}

      <View style={styles.footer}>
        <SubmitButton
          title="New claim"
          busy={false}
          onPress={() => router.push("/claims/new")}
        />
      </View>
    </View>
  );
}

/** Sections in CLAIM_STATUSES order; statuses with no claims are omitted. */
function groupByStatus(claims: ClaimSummary[]): Section[] {
  return CLAIM_STATUSES.map((status) => ({
    title: statusLabel(status),
    status,
    data: claims.filter((claim) => claim.status === status),
  })).filter((section) => section.data.length > 0);
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  chipsScroll: { flexGrow: 0 },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#c8c8c8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  chipText: { fontSize: 14, color: "#1f2937", textTransform: "capitalize" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "capitalize",
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d1d5db",
  },
  pressed: { opacity: 0.6 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: "500" },
  rowMeta: { fontSize: 13, color: "#6b7280" },
  empty: { color: "#6b7280", paddingTop: 32, textAlign: "center" },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d1d5db",
  },
});
