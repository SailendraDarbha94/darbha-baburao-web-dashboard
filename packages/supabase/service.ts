import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type ServiceSupabaseClient = ReturnType<typeof createServiceClient>;

// Bypasses RLS. Server-only; the web wrapper (apps/web/lib/supabase/service.ts) imports 'server-only' so this
// can never reach a client bundle. Used for the very few explicitly admin-only operations listed in
// docs/PLAN.md §2.4 (push-token invalidation).
export function createServiceClient(opts: {
  url: string;
  serviceRoleKey: string;
}) {
  return createClient<Database>(opts.url, opts.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
