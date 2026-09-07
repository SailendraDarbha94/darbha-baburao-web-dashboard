"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      // signOut() clears the auth cookies via @supabase/ssr and revokes the refresh token server-side.
      // If it fails (network, missing env) we still go to /login; proxy.ts then decides what the user sees.
      await createBrowserSupabaseClient().auth.signOut();
      toast.success("Signed out");
    } catch (caught) {
      // Still navigating (see above), but no longer silently: the admin is told the server-side
      // revocation did not happen, so they can sign out again from a working connection.
      toast.error("Sign-out may not have completed", {
        description: caught instanceof Error ? caught.message : String(caught),
      });
    }
    router.replace("/login");
    // Server components rendered with the old session must re-render without it.
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
