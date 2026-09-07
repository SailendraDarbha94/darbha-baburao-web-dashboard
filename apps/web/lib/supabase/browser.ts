import { createBrowserClient } from "@claims/supabase/browser";
import { getPublicSupabaseEnv } from "@/lib/env";

// For client components (login form, sign-out button, later the API client). @supabase/ssr keeps the
// session in cookies so proxy.ts and server components see the same session. Call it inside an event
// handler or hook, never at module scope: the env check must run in the browser, not at build time.
export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getPublicSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
