import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import type { Database } from "./types";

export type MobileSupabaseClient = ReturnType<typeof createMobileClient>;

// For the Expo app. The storage adapter (AsyncStorage) is injected from the app so this package has no
// React Native imports. PKCE flow: password-reset links carry a one-time code exchanged on the device
// (docs/PLAN.md decision h); detectSessionInUrl is off because the app handles deep links itself.
export function createMobileClient(opts: {
  url: string;
  publishableKey: string;
  storage: SupportedStorage;
}) {
  return createClient<Database>(opts.url, opts.publishableKey, {
    auth: {
      storage: opts.storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}
