import type * as React from "react";
import { cn } from "@/lib/utils";

// A plain <select> styled like the Input primitive. Used instead of the shadcn Select (a base-ui popover
// widget) because the claims filter form must submit as a plain GET form with no client JavaScript, and
// the actions panel uses the same element so the two look alike.
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}
