import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type BearerSupabaseClient = ReturnType<typeof createBearerClient>;

// For route handlers: a client acting as the caller whose JWT arrived in the Authorization header.
// RLS applies exactly as it would for that user. No session persistence or refresh: the handler lives for one
// request and the client (mobile or browser) owns the session. Verify the token with
// `client.auth.getUser(accessToken)` before trusting it.
export function createBearerClient(opts: {
  url: string;
  publishableKey: string;
  accessToken: string;
}) {
  return createClient<Database>(opts.url, opts.publishableKey, {
    global: { headers: { Authorization: `Bearer ${opts.accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
