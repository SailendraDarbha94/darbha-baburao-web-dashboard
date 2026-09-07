import { isEditable, type ClaimDetail } from "@claims/shared";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ClaimForm } from "../../../../components/claim-form";
import { ErrorBanner } from "../../../../components/error-banner";
import { errorMessage } from "../../../../lib/api";
import { getClaim, updateClaim } from "../../../../lib/claims";

// Edit a draft or info_requested claim. Loads the current values from the server rather than trusting
// whatever the detail screen had, then PATCHes the six form fields (details jsonb is shown read-only in
// this phase and never sent, so the server leaves it untouched).
export default function EditClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClaim(await getClaim(id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  // One load is enough: the form owns the values from then on, and reloading on a later focus (or after
  // a failed save) would throw away what the agent typed.
  useFocusEffect(
    useCallback(() => {
      if (!claim) {
        void load();
      }
    }, [claim, load]),
  );

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

  if (!isEditable(claim.status)) {
    return (
      <View style={styles.center}>
        <Text style={styles.notice}>
          This claim is {claim.status.replace(/_/g, " ")} and can no longer be
          edited.
        </Text>
      </View>
    );
  }

  return (
    <ClaimForm
      mode="edit"
      initialValues={{
        title: claim.title,
        claim_type: claim.claim_type,
        description: claim.description,
        incident_date: claim.incident_date,
        policy_number: claim.policy_number,
        claimant_name: claim.claimant_name,
      }}
      onSubmit={async (values) => {
        await updateClaim(id, {
          title: values.title,
          claim_type: values.claim_type,
          description: values.description,
          incident_date: values.incident_date ?? null,
          policy_number: values.policy_number ?? null,
          claimant_name: values.claimant_name ?? null,
        });
        // The detail screen reloads on focus, so nothing needs to be passed back.
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  notice: { fontSize: 16, color: "#444", textAlign: "center" },
});
