import { SignOutButton } from "@/components/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Landing page for signed-in non-admins (agents who opened the dashboard). Public in proxy.ts, so it also
// renders for a signed-out visitor; the email line is simply omitted then.
export default async function NotAuthorisedPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Not authorised</CardTitle>
          <CardDescription>
            This dashboard is for admins only. Field agents use the mobile app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user?.email ? (
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{user.email}</span>.
            </p>
          ) : null}
          <div>
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
