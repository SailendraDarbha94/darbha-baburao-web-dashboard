"use client";

import { ErrorCard } from "@/components/error-card";

// Root error boundary. error.tsx wraps the segments *below* it but not its own layout, so this is the
// only place that can catch a throw from app/(admin)/layout.tsx — where requireAdminPage() makes the
// remote Supabase call that runs on every admin page load. Without it that failure falls through to
// Next's unstyled default error screen.
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <ErrorCard error={error} retry={retry} />
    </div>
  );
}
