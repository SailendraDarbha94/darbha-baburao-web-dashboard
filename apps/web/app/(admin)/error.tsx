"use client";

import { ErrorCard } from "@/components/error-card";

// Error boundary for every admin *page* (Next requires a Client Component here). A failed Supabase read
// in a page segment now shows this instead of a blank screen, with the admin header still in place.
// Failures inside app/(admin)/layout.tsx itself are caught one level up, by app/error.tsx.
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorCard error={error} retry={retry} />;
}
