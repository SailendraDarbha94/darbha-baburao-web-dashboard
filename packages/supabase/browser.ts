import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

// For web client components (login form, client-side API calls). @supabase/ssr stores the session in cookies
// so middleware and server components can read it. Safe to call repeatedly: @supabase/ssr returns a singleton.
export function createBrowserClient(url: string, publishableKey: string) {
  return createSsrBrowserClient<Database>(url, publishableKey);
}
