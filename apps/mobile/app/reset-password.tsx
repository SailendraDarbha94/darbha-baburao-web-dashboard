import { passwordSchema } from "@claims/shared";
import { useLinkingURL } from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  ErrorText,
  Field,
  FormScreen,
  InfoText,
  SubmitButton,
  TextLink,
} from "../components/form";
import { requireSupabase } from "../lib/supabase";

// Deep-link target for the password-reset email (docs/PLAN.md decision h). Registered outside the root
// layout's route guards so it opens whether the user is signed in or out.
//
// What arrives here, after Supabase has verified the emailed token server-side:
//   success: <redirect>?code=<one-time code>
//   failure: <redirect>?error=access_denied&error_code=otp_expired&error_description=...   (query)
//        or: <redirect>#error=access_denied&error_code=otp_expired&error_description=...   (fragment)
// Expo Router only parses the query into search params, so the raw URL is read as well for the fragment.
//
// Anything in the URL is untrusted: the claimsagent:// scheme can be opened by any app or web page on the
// device, so `error_description` is never rendered (it would let a third party put arbitrary text inside
// this screen). Only `error_code` is used, and only to pick one of the fixed sentences below.

type LinkParams = {
  code: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

/** Reads the parameters from the raw URL: query first, then the fragment for error fields. */
function parseResetLink(url: string | null): LinkParams {
  if (!url) {
    return { code: null, errorCode: null, errorDescription: null };
  }
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex === -1 ? "" : url.slice(hashIndex + 1);
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
  // URLSearchParams is Expo's built-in WHATWG implementation (expo/src/winter), not React Native's stub.
  const q = new URLSearchParams(query);
  const f = new URLSearchParams(fragment);
  return {
    code: q.get("code"),
    errorCode: q.get("error_code") ?? f.get("error_code"),
    errorDescription: q.get("error_description") ?? f.get("error_description"),
  };
}

/** Search params may be arrays when a key repeats; the first value is the only meaningful one here. */
function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

/**
 * Turns an auth error code into a fixed sentence the agent can act on. `fallback` is shown for unknown
 * codes; callers pass a Supabase-originated message there, never text taken from the URL.
 */
function describeLinkError(
  code: string | null,
  fallback = "This reset link could not be used. Request a new one below.",
): string {
  switch (code) {
    case "otp_expired":
    case "flow_state_expired":
      return "This reset link has expired or was already used. Request a new one below.";
    case "pkce_code_verifier_not_found":
    case "flow_state_not_found":
    case "bad_code_verifier":
      // The PKCE verifier is stored on the phone that requested the reset. When this device has none,
      // auth-js fails locally with pkce_code_verifier_not_found before calling the server (its message
      // talks about @supabase/ssr and is meaningless on a phone); the other two are the server-side
      // versions of the same mismatch (link opened elsewhere, or after reinstalling the app).
      return "This link must be opened on the phone that requested the reset, in the same app. Request a new link from this phone.";
    case "access_denied":
      return "This reset link was rejected. Request a new one below.";
    default:
      return fallback;
  }
}

type Exchange =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "done" }
  | { status: "error"; message: string };

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = useLinkingURL();
  const params = useLocalSearchParams<{
    code?: string;
    error_code?: string;
    error_description?: string;
  }>();

  const fromUrl = parseResetLink(url);
  const code = fromUrl.code ?? first(params.code);
  const errorCode = fromUrl.errorCode ?? first(params.error_code);
  const errorDescription =
    fromUrl.errorDescription ?? first(params.error_description);

  const [exchange, setExchange] = useState<Exchange>({ status: "idle" });
  // The code is single-use, so the exchange must run exactly once even though the URL hook can re-fire
  // and React may re-run effects in development.
  const exchangedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!code || errorCode || exchangedCode.current === code) {
      return;
    }
    exchangedCode.current = code;
    setExchange({ status: "pending" });
    // Exchanging signs the user in immediately; the session provider sees SIGNED_IN, but this screen
    // stays mounted because it is outside the guards. Leaving now would keep the OLD password valid,
    // which is why the form below is the only exit on the success path.
    void requireSupabase()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          // error.message comes from Supabase (or auth-js), not from the URL, so it is safe to show.
          setExchange({
            status: "error",
            message: describeLinkError(
              error.code ?? null,
              `This reset link could not be used: ${error.message}`,
            ),
          });
        } else {
          setExchange({ status: "done" });
        }
      });
  }, [code, errorCode]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password) {
      setFormError("Enter a new password.");
      return;
    }
    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      setFormError(
        passwordCheck.error.issues[0]?.message ?? "Password too short.",
      );
      return;
    }
    if (password !== confirm) {
      setFormError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const { error: authError } = await requireSupabase().auth.updateUser({
        password,
      });
      if (authError) {
        setFormError(authError.message);
        return;
      }
      // The session already exists (from the exchange); "/" resolves to (app)/index behind the guard.
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  if (errorCode || errorDescription) {
    if (__DEV__ && errorDescription) {
      // Useful while debugging the dashboard configuration; deliberately not shown in the UI (see top).
      console.log(`[auth] Reset link error_description: ${errorDescription}`);
    }
    return (
      <FormScreen title="Reset link problem">
        <ErrorText message={describeLinkError(errorCode)} />
        <TextLink href="/forgot-password">Request a new reset link</TextLink>
      </FormScreen>
    );
  }

  if (!code) {
    return (
      <FormScreen title="Reset password">
        <InfoText>
          This screen only works when opened from the link in a password-reset
          email. Request one and open the link on this phone.
        </InfoText>
        <TextLink href="/forgot-password">Request a reset link</TextLink>
      </FormScreen>
    );
  }

  if (exchange.status === "error") {
    return (
      <FormScreen title="Reset link problem">
        <ErrorText message={exchange.message} />
        <TextLink href="/forgot-password">Request a new reset link</TextLink>
      </FormScreen>
    );
  }

  if (exchange.status !== "done") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FormScreen title="Choose a new password">
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
      />
      <Field
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
      />
      <ErrorText message={formError} />
      <SubmitButton
        title="Set new password"
        busy={busy}
        onPress={() => void submit()}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
