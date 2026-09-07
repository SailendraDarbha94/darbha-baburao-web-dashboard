import { useState } from "react";
import {
  ErrorText,
  Field,
  FormScreen,
  InfoText,
  SubmitButton,
  TextLink,
} from "../../components/form";
import { RESET_REDIRECT_URL } from "../../lib/auth-redirect";
import { requireSupabase } from "../../lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // PKCE flow (docs/PLAN.md decision h): the client stores a code verifier in AsyncStorage now and
      // Supabase redirects the emailed link back to RESET_REDIRECT_URL with ?code=..., which
      // app/reset-password.tsx exchanges. The verifier lives on THIS phone, hence the wording below.
      const { error: authError } =
        await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
          redirectTo: RESET_REDIRECT_URL,
        });
      if (authError) {
        setError(authError.message);
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <FormScreen title="Check your email">
        <InfoText>
          If an account exists for {email.trim()}, a password-reset link is on
          its way. Open the link on this phone in Safari or Chrome, not in your
          mail app&apos;s built-in browser, and it will bring you back here to
          choose a new password.
        </InfoText>
        <TextLink href="/sign-in">Back to sign in</TextLink>
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Forgot password">
      <InfoText>
        Enter the email you signed up with and we will send you a link to reset
        your password.
      </InfoText>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        editable={!busy}
        onSubmitEditing={() => void submit()}
        returnKeyType="send"
      />
      <ErrorText message={error} />
      <SubmitButton
        title="Send reset link"
        busy={busy}
        onPress={() => void submit()}
      />
      <TextLink href="/sign-in">Back to sign in</TextLink>
    </FormScreen>
  );
}
