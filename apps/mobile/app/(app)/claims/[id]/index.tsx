import {
  canTransition,
  isEditable,
  type ClaimDetail,
  type ClaimNote,
} from "@claims/shared";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Attachments,
  type PendingCounts,
} from "../../../../components/attachments";
import { ErrorBanner } from "../../../../components/error-banner";
import { ErrorText, InfoText, SubmitButton } from "../../../../components/form";
import { StatusBadge } from "../../../../components/status-badge";
import { ApiError, errorMessage, fieldErrorsOf } from "../../../../lib/api";
import { getClaim, submitClaim } from "../../../../lib/claims";

// Claim detail: status, the structured fields, details jsonb (read-only key/value), messages from the
// reviewer (agent_visible notes are the only ones the API ever returns), attachments, and the agent's
// two actions: Edit (draft / info_requested) and Submit (draft) or Resubmit (info_requested).

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  claim_type: "Claim type",
  incident_date: "Incident date",
  policy_number: "Policy number",
  claimant_name: "Claimant name",
};

export default function ClaimDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Field names the submit route reported as missing (VALIDATION_ERROR details.fieldErrors).
  const [missingFields, setMissingFields] = useState<string[]>([]);
  // Files still uploading or failed on this screen. Submit is held while one is in flight: the submit
  // route deletes every reservation whose bytes have not arrived, so it would drop that file.
  const [pendingUploads, setPendingUploads] = useState<PendingCounts>({
    uploading: 0,
    failed: 0,
  });

  const load = useCallback(async () => {
    try {
      setClaim(await getClaim(id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  // Reload on every focus: the edit screen and the submit action change what is shown here.
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

  function confirmSubmit(resubmit: boolean) {
    const failed = pendingUploads.failed;
    const failedNote =
      failed > 0
        ? ` ${failed === 1 ? "One file" : `${failed} files`} failed to upload and will not be included; retry or remove ${failed === 1 ? "it" : "them"} first if needed.`
        : "";
    Alert.alert(
      resubmit ? "Resubmit claim?" : "Submit claim?",
      (resubmit
        ? "The reviewer will see your updated claim."
        : "You will not be able to change the attachments after submitting.") +
        failedNote,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: resubmit ? "Resubmit" : "Submit",
          onPress: () => void submit(),
        },
      ],
    );
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    setMissingFields([]);
    try {
      setClaim(await submitClaim(id));
    } catch (e) {
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") {
        const fields = Object.keys(fieldErrorsOf(e));
        setMissingFields(fields);
        setSubmitError(
          fields.length > 0 ? "Some required fields are missing:" : e.message,
        );
      } else {
        setSubmitError(errorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!claim) {
    return (
      <View style={styles.screen}>
        {error !== null ? (
          <ErrorBanner message={error} onRetry={() => void load()} />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </View>
    );
  }

  const editable = isEditable(claim.status);
  const submittable = canTransition(claim.status, "submitted", "agent");
  const resubmit = claim.status === "info_requested";
  const detailEntries = Object.entries(claim.details);

  return (
    <View style={styles.screen}>
      {error !== null ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
      >
        <StatusBadge status={claim.status} />
        <Text style={styles.title}>{claim.title}</Text>

        <View style={styles.section}>
          <KeyValue label="Claim type" value={claim.claim_type} />
          <KeyValue label="Incident date" value={claim.incident_date} />
          <KeyValue label="Policy number" value={claim.policy_number} />
          <KeyValue label="Claimant name" value={claim.claimant_name} />
          <KeyValue
            label="Description"
            value={claim.description === "" ? null : claim.description}
          />
        </View>

        {detailEntries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Details</Text>
            {detailEntries.map(([key, value]) => (
              <KeyValue key={key} label={key} value={stringify(value)} />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.heading}>Messages from the reviewer</Text>
          {claim.notes.length === 0 ? (
            <Text style={styles.muted}>No messages yet.</Text>
          ) : (
            claim.notes.map((note) => <Note key={note.id} note={note} />)
          )}
        </View>

        <Attachments
          claimId={claim.id}
          status={claim.status}
          files={claim.files}
          onChanged={load}
          onPendingChange={setPendingUploads}
        />

        {editable || submittable ? (
          <View style={styles.actions}>
            {submitError !== null ? (
              <View style={styles.validation}>
                <ErrorText message={submitError} />
                {missingFields.map((field) => (
                  <Text key={field} style={styles.missing}>
                    • {FIELD_LABELS[field] ?? field}
                  </Text>
                ))}
                {missingFields.length > 0 && editable ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/claims/${claim.id}/edit`)}
                  >
                    <Text style={styles.link}>Fill them in</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {editable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting }}
                disabled={submitting}
                onPress={() => router.push(`/claims/${claim.id}/edit`)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (pressed || submitting) && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
            ) : null}
            {submittable && pendingUploads.uploading > 0 ? (
              <>
                <InfoText>
                  Wait for uploads to finish before submitting.
                </InfoText>
                <View
                  accessibilityRole="button"
                  accessibilityState={{ disabled: true }}
                  style={styles.disabledButton}
                >
                  <Text style={styles.disabledButtonText}>
                    {resubmit ? "Resubmit" : "Submit"}
                  </Text>
                </View>
              </>
            ) : submittable ? (
              <SubmitButton
                title={resubmit ? "Resubmit" : "Submit"}
                busy={submitting}
                onPress={() => confirmSubmit(resubmit)}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function KeyValue({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, value === null && styles.muted]}>
        {value ?? "—"}
      </Text>
    </View>
  );
}

function Note({ note }: { note: ClaimNote }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteBody}>{note.body}</Text>
      <Text style={styles.noteMeta}>{formatDateTime(note.created_at)}</Text>
    </View>
  );
}

/** details jsonb values: primitives as-is, anything nested as JSON. */
function stringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 24, gap: 20 },
  title: { fontSize: 22, fontWeight: "600" },
  section: { gap: 10 },
  heading: { fontSize: 16, fontWeight: "600" },
  kv: { gap: 2 },
  kvLabel: { fontSize: 12, color: "#6b7280", textTransform: "uppercase" },
  kvValue: { fontSize: 16 },
  muted: { color: "#6b7280" },
  note: {
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  noteBody: { fontSize: 15, lineHeight: 21 },
  noteMeta: { fontSize: 12, color: "#9a3412" },
  actions: { gap: 12, paddingTop: 8 },
  validation: { gap: 4 },
  missing: { color: "#b91c1c", fontSize: 14 },
  link: { color: "#1d4ed8", fontSize: 15, paddingVertical: 4 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#1d4ed8",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  secondaryButtonText: { color: "#1d4ed8", fontSize: 16, fontWeight: "600" },
  // The primary button's look at reduced opacity, without a press handler.
  disabledButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    opacity: 0.5,
  },
  disabledButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.6 },
});
