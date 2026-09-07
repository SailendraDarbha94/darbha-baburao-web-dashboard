import "server-only";
import { cookies } from "next/headers";
import { createCookieClient } from "@claims/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/env";

// For Server Components and layouts. One client per render; never cache it across requests.
export async function createServerSupabaseClient() {
  // cookies() first: it marks the route dynamic, so `next build` never reaches the env check below.
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseEnv();

  return createCookieClient({
    url,
    publishableKey,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies (Next throws here). That is fine: proxy.ts is the only
          // place that refreshes the session and writes the new tokens back; by the time a Server
          // Component runs, the request already carries refreshed cookies.
        }
      },
    },
  });
}
