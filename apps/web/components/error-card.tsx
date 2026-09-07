"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Shared body of the two error.tsx boundaries (app/ and app/(admin)/). They are separate files because
// a boundary only catches throws from segments *below* it — app/(admin)/error.tsx cannot catch the
// requireAdminPage() call in app/(admin)/layout.tsx, so the root one has to exist as well.
//
// Only error.message is shown, and in production React replaces it with a generic string and gives the
// real one a digest that ties it to the server log — so nothing here leaks a stack trace or query detail.
export function ErrorCard({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // `retry()`, not `reset()`: reset only clears the boundary state and re-renders the same cached RSC
  // payload that already threw, so the failed Supabase read would never be re-run. retry() refreshes the
  // router first, which fetches the segment again.
  retry: () => void;
}) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          This page could not be loaded. It is usually a temporary problem with
          the connection to the database — trying again often works.
        </p>

        {error.message ? (
          <p className="text-sm break-words">{error.message}</p>
        ) : null}

        {error.digest ? (
          <p className="text-xs text-muted-foreground">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={retry}>Try again</Button>
          <Link
            href="/claims"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to claims
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
