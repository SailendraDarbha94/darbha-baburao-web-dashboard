import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { USER_ROLES, type UserRole } from "@claims/shared";
import type { Tables } from "@claims/supabase/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminPageAuth = { user: User; profile: Tables<"profiles"> };

// Admin gate for Server Components and layouts (docs/PLAN.md decision j). proxy.ts already redirects
// non-admins, but a path the matcher misses (or a future matcher edit) must still not render admin data.
// The (admin) layout calls this for its own render, and every admin page calls it again before its first
// query: a layout's redirect ends only the layout's render, the page segment still runs (Next docs,
// "Layouts and auth checks"). React cache() dedupes the calls within one request; on a client-side
// navigation only the page re-renders, and its own call runs. Redirects instead of throwing.
export const requireAdminPage = cache(async (): Promise<AdminPageAuth> => {
  const supabase = await createServerSupabaseClient();

  // getUser() validates the token with the Auth server; getSession() would only decode the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Own profiles row via RLS (profiles_select_own). A missing row (trigger not run) counts as non-admin.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  // packages/supabase/types.ts is a hand-written stand-in until `pnpm db:types` runs against a real
  // project, so the role is checked against the shared USER_ROLES list at runtime rather than trusted from
  // the type alone; an unknown value is treated as non-admin.
  if (!profile || !isKnownRole(profile.role) || profile.role !== "admin") {
    redirect("/not-authorised");
  }

  return { user, profile };
});

function isKnownRole(role: string): role is UserRole {
  return (USER_ROLES as readonly string[]).includes(role);
}
