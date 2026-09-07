import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./types";

export type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: CookieToSet[]) => void;
};

export type CookieSupabaseClient = ReturnType<typeof createCookieClient>;

// For web server-side code that has a cookie session: middleware, server components, layouts.
// The cookie adapter is injected so this package never imports next/* (it must stay bundle-safe for Metro).
export function createCookieClient(opts: {
  url: string;
  publishableKey: string;
  cookies: CookieAdapter;
}) {
  return createServerClient<Database>(opts.url, opts.publishableKey, {
    cookies: opts.cookies,
  });
}
