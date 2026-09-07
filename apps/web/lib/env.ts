// Environment access for the web app. Every reader is a function, never a module-scope constant, so that
// `next build` (which imports every page with no env set) and the browser bundle (which inlines
// process.env.NEXT_PUBLIC_* at build time) both work, and a missing variable surfaces as a clear message
// at the moment it is needed rather than as a stack trace at import time.
//
// Next.js replaces `process.env.NEXT_PUBLIC_X` in client bundles only when the property is accessed
// literally, so these must stay written out — no `process.env[name]` lookups.

export type PublicSupabaseEnv = { url: string; publishableKey: string };

function missingEnv(name: string): Error {
  return new Error(
    `Missing environment variable ${name}. Copy apps/web/.env.example to apps/web/.env.local and fill it in.`,
  );
}

/** Supabase URL + publishable (anon) key. Safe for the browser; RLS is what protects data. */
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw missingEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) throw missingEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, publishableKey };
}

/** Service-role (secret) key. Server-only; only lib/supabase/service.ts should call this. */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw missingEnv("SUPABASE_SERVICE_ROLE_KEY");
  return key;
}
