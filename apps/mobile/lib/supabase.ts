import {
  createMobileClient,
  type MobileSupabaseClient,
} from "@claims/supabase/mobile";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { getSupabaseEnv } from "./env";

// One client for the whole app, created lazily so that importing this module never throws or hits
// AsyncStorage when the environment is not configured (the root layout checks getSupabaseEnv() first).
let client: MobileSupabaseClient | null = null;

/**
 * Returns the shared Supabase client, or null when EXPO_PUBLIC_SUPABASE_* are not set.
 * Screens rendered below the root layout can use requireSupabase() instead, since the layout has
 * already verified the configuration by the time they mount.
 */
export function getSupabase(): MobileSupabaseClient | null {
  if (client) {
    return client;
  }
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  // AsyncStorage for the session (docs/PLAN.md decision s): Supabase's documented Expo setup, and
  // expo-secure-store's 2 KB value limit is smaller than a session.
  const created = createMobileClient({
    url: env.url,
    publishableKey: env.publishableKey,
    storage: AsyncStorage,
  });

  // Supabase's Expo guide: refresh the session only while the app is in the foreground. Outside a browser
  // auth-js starts its refresh ticker at construction, so this listener's job is to pause it while the
  // app is backgrounded and resume it (with an immediate refresh check) when it returns. Registered once,
  // here, because the client is created once; nothing ever removes it.
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void created.auth.startAutoRefresh();
    } else {
      void created.auth.stopAutoRefresh();
    }
  });

  client = created;
  return client;
}

/**
 * For code that runs inside the root layout's configuration check, where a missing client is a
 * programming error rather than a user-facing state.
 */
export function requireSupabase(): MobileSupabaseClient {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). " +
        "The root layout should have rendered the configuration screen instead of this route.",
    );
  }
  return supabase;
}
