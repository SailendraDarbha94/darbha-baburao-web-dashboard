import { useState } from "react";
import { View } from "react-native";
import {
  ErrorText,
  Field,
  FormScreen,
  SubmitButton,
  TextLink,
} from "../../components/form";
import { requireSupabase } from "../../lib/supabase";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: authError } =
        await requireSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (authError) {
        // Inputs are left as typed so a typo can be corrected without re-entering everything.
        setError(authError.message);
      }
      // On success the SessionProvider receives SIGNED_IN and the root guard swaps this group for (app).
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen title="Sign in">
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
        autoComplete="current-password"
        textContentType="password"
        editable={!busy}
        onSubmitEditing={() => void submit()}
        returnKeyType="go"
      />
      <ErrorText message={error} />
      <SubmitButton title="Sign in" busy={busy} onPress={() => void submit()} />
      <View>
        <TextLink href="/forgot-password">Forgot your password?</TextLink>
        <TextLink href="/sign-up">Create an account</TextLink>
      </View>
    </FormScreen>
  );
}
