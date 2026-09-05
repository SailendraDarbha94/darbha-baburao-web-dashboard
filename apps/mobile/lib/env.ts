// Supabase configuration for the mobile app, read from EXPO_PUBLIC_* variables (apps/mobile/.env.example).
//
// Expo inlines `process.env.EXPO_PUBLIC_*` at bundle time, but only for STATIC member accesses like the
// two below; `process.env[name]` would stay undefined in the bundle. Keep them written out in full.
//
// Returns null instead of throwing so the root layout can render a configuration-error screen; a throw at
// module scope would surface as a red box with a stack trace, which is not "a clear message".

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

/** Variable names, for the configuration-error screen. */
export const SUPABASE_ENV_VARS = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) {
    return null;
  }
  return { url, publishableKey };
}

/**
 * Base URL of the web app that hosts the API route handlers (docs/PLAN.md §3), without a trailing slash.
 * Throws instead of returning null: the API is only reached from screens that are rendered after the root
 * layout's configuration check, and lib/api.ts surfaces the message through the normal error path.
 */
export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to apps/mobile/.env and restart the Expo dev server.",
    );
  }
  return url.replace(/\/+$/, "");
}
