import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

// Session refresh + admin gate for PAGES (docs/PLAN.md decision j). Route handlers under /api are
// bearer-only and excluded by the matcher; they do their own auth (lib/api/auth.ts).
//
// Rules: /login and /not-authorised are public. No user anywhere else → /login. A signed-in user on
// /login → /claims (admin) or /not-authorised (agent). A non-admin on any other path → /not-authorised.

const PUBLIC_PATHS = new Set(["/login", "/not-authorised"]);

export async function proxy(request: NextRequest) {
  let ctx: ReturnType<typeof createMiddlewareSupabaseClient>;
  try {
    ctx = createMiddlewareSupabaseClient(request);
  } catch (error) {
    // Missing env: a readable plain-text 500 instead of a stack trace in the browser.
    const message = error instanceof Error ? error.message : String(error);
    return new NextResponse(`Server misconfiguration: ${message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // getUser() BEFORE any early return: this is the call that refreshes an expired session, and every
  // request (including ones that end in a redirect) must carry the refreshed cookies, otherwise the next
  // request presents an already-rotated refresh token and the admin is logged out.
  const {
    data: { user },
  } = await ctx.supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  // Every redirect copies the (possibly refreshed) cookies from the pass-through response.
  const redirectTo = (path: string): NextResponse => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    for (const cookie of ctx.response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!user) {
    return isPublic ? ctx.response : redirectTo("/login");
  }

  // Own profiles row (RLS). Any read failure (no row, no table yet) is treated as "not admin".
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  if (pathname === "/login") {
    return redirectTo(isAdmin ? "/claims" : "/not-authorised");
  }
  if (!isAdmin && !isPublic) {
    return redirectTo("/not-authorised");
  }
  return ctx.response;
}

export const config = {
  // All page paths except: /api/* (bearer-only route handlers), Next internals, the favicon, and paths
  // ENDING in a static-asset extension (public/ files). The exclusion is a trailing-extension list rather
  // than "any dot anywhere" so that a page path containing a dot (/claims/v1.0) still goes through the
  // gate. Must be a literal: Next reads it at build time.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|woff2?)$).*)",
  ],
};
