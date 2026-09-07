"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// Email/password sign-in against Supabase Auth directly (docs/PLAN.md decision u). @supabase/ssr writes
// the session cookies; proxy.ts then routes admins to /claims and everyone else to /not-authorised.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      // Created in the handler, not at module scope: the env check must not run during prerendering.
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        // Inline text is the always-visible, accessible signal; the toast is the extra nudge for
        // someone whose eyes are on the button rather than on the field.
        setError(signInError.message);
        toast.error("Could not sign in", { description: signInError.message });
        setPending(false);
        return;
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      toast.error("Could not sign in", { description: message });
      setPending(false);
      return;
    }

    // The toaster lives in the root layout, so this survives the navigation below.
    toast.success("Signed in");
    // A full document navigation rather than router.replace(): a client transition does not commit until
    // the whole /claims RSC payload has been fetched (the proxy's getUser, then the page's profile and
    // claims queries — measured at ~4 s warm and ~12 s on a cold function), and until then the browser
    // stays on this page with the button disabled and nothing moving, which reads as a hang. Handing the
    // navigation to the browser shows its own progress immediately, streams the dashboard's loading
    // skeleton as the server renders, and tears this page down so the pending state cannot get stuck.
    // It also guarantees the request carries the cookies @supabase/ssr just wrote, with no router cache
    // to invalidate afterwards.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate: see above.
    window.location.assign("/claims");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Claims Admin</CardTitle>
          <CardDescription>Sign in with your admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
