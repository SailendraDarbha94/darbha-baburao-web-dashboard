import { Link, type Href } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

// The handful of plain React Native pieces the auth screens share. Deliberately not a form library:
// each screen keeps its own useState per field, which is what makes the values survive a failed request
// (nothing resets them but the user). react-hook-form is used only where a form is large enough to earn
// it: components/claim-form.tsx.

/** Scrollable, keyboard-aware page with a title. */
export function FormScreen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled" // a tap on the submit button must not just dismiss the keyboard
      >
        <Text style={styles.title}>{title}</Text>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Labelled text input. Pass the usual TextInput props (value, onChangeText, secureTextEntry, ...). */
export function Field({ label, ...input }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#8a8a8a"
        {...input}
      />
    </View>
  );
}

/** Primary action. Disabled and showing a spinner while `busy`, so a request cannot be sent twice. */
export function SubmitButton({
  title,
  busy,
  onPress,
}: {
  title: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        (pressed || busy) && styles.buttonPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}

/** Inline error under a form. Renders nothing when there is no message, so it can stay mounted. */
export function ErrorText({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  );
}

/** Neutral status text (e.g. "check your email"). */
export function InfoText({ children }: { children: ReactNode }) {
  return <Text style={styles.info}>{children}</Text>;
}

/** Navigation link rendered as text, for "Forgot password?" and friends. */
export function TextLink({
  href,
  children,
}: {
  href: Href;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={styles.link}>
      {children}
    </Link>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 24, gap: 16, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "600", marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 14, color: "#444" },
  input: {
    borderWidth: 1,
    borderColor: "#c8c8c8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#b91c1c", fontSize: 14 },
  info: { color: "#1f2937", fontSize: 15, lineHeight: 22 },
  link: { color: "#1d4ed8", fontSize: 15, paddingVertical: 4 },
});
