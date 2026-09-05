import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";

// Where Supabase sends the user after verifying a password-reset link (docs/PLAN.md decision h).
//
// - Expo Go cannot open a custom scheme, so there the URL is whatever Expo Go is served from:
//   exp://<lan-ip>:8081/--/reset-password. It changes with the developer's LAN address, which is why the
//   value is logged below: paste it into Supabase → Authentication → URL Configuration → Redirect URLs.
// - Development, preview and production builds own the "claimsagent" scheme (app.config.ts), so the
//   literal is used rather than Linking.createURL(), which would yield the same string but only after
//   the native module has resolved the scheme.
//
// Supabase compares redirect URLs against the allow-list exactly (with glob support), so the value sent
// here must match a dashboard entry; otherwise Supabase silently falls back to the Site URL.
export const RESET_REDIRECT_URL: string =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? Linking.createURL("reset-password")
    : "claimsagent://reset-password";

if (__DEV__) {
  console.log(
    `[auth] Password-reset redirect URL for this session: ${RESET_REDIRECT_URL}\n` +
      "       Add it to Supabase → Authentication → URL Configuration → Redirect URLs.",
  );
}
