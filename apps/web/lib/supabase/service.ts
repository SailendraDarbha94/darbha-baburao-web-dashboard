import "server-only";
import { createServiceClient } from "@claims/supabase/service";
import { getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";

// Bypasses RLS. lib/push.ts is its only importer (docs/PLAN.md §2.4).
// "server-only" makes any client-component import a build error, so the secret key cannot leak.
export function createServiceSupabaseClient() {
  const { url } = getPublicSupabaseEnv();
  return createServiceClient({ url, serviceRoleKey: getServiceRoleKey() });
}
