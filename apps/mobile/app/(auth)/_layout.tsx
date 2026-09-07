import { Stack } from "expo-router";

// The group has no index route, so tell the router which screen "/" resolves to while signed out.
// Without this the first route in file order would be used, which is forgot-password.
export const unstable_settings = {
  anchor: "sign-in",
};

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
      <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: "Forgot password" }}
      />
    </Stack>
  );
}
