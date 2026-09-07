import { passwordSchema } from "@claims/shared";
import { useState } from "react";
import {
  ErrorText,
  Field,
  FormScreen,
  InfoText,
  SubmitButton,
  TextLink,
} from "../../components/form";
import { requireSupabase } from "../../lib/supabase";

export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // True when Supabase accepted the sign-up but returned no session, i.e. "Confirm email" is enabled in
  // the dashboard and the user has to open the confirmation email before signing in.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function submit() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Enter your name, email and a password.");
      return;
    }
    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      setError(passwordCheck.error.issues[0]?.message ?? "Password too short.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error: authError } = await requireSupabase().auth.signUp({
        email: email.trim(),
        password,
        // The handle_new_user trigger (packages/supabase/migrations/20260902000001_profiles.sql) copies
        // raw_user_meta_data.full_name into profiles.full_name; nothing else reads this metadata.
        options: { data: { full_name: fullName.trim() } },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (!data.session) {
        // Also the response for an already-registered email while confirmation is on (Supabase returns
        // an obfuscated user to avoid account enumeration), so the message must stay generic.
        setAwaitingConfirmation(true);
      }
      // With a session, the root guard switches to the (app) group.
    } finally {
      setBusy(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <FormScreen title="Check your email">
        <InfoText>
          Check your email to confirm your account, then sign in.
        </InfoText>
        <TextLink href="/sign-in">Back to sign in</TextLink>
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Create account">
      <Field
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
        editable={!busy}
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        editable={!busy}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!busy}
        onSubmitEditing={() => void submit()}
        returnKeyType="go"
      />
      <ErrorText message={error} />
      <SubmitButton
        title="Create account"
        busy={busy}
        onPress={() => void submit()}
      />
      <TextLink href="/sign-in">Already have an account? Sign in</TextLink>
    </FormScreen>
  );
}
