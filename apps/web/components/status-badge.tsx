import type { ClaimStatus } from "@claims/shared";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Human labels for the status enum; shared by the badge, the filter form and the agents table.
export const STATUS_LABELS: Readonly<Record<ClaimStatus, string>> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  info_requested: "Info requested",
};

// The badge primitive's variants cover only some of the meanings, so approved / info_requested get plain
// Tailwind colours. Rendered as a plain <span> with badgeVariants (not <Badge>): Badge uses base-ui's
// useRender hook, which is not marked for the client, and this must work inside Server Components.
const STATUS_CLASSES: Readonly<Record<ClaimStatus, string>> = {
  draft: badgeVariants({ variant: "outline" }),
  submitted: badgeVariants({ variant: "secondary" }),
  under_review: badgeVariants({ variant: "default" }),
  approved: cn(
    badgeVariants({ variant: "outline" }),
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  ),
  rejected: badgeVariants({ variant: "destructive" }),
  info_requested: cn(
    badgeVariants({ variant: "outline" }),
    "border-amber-200 bg-amber-50 text-amber-900",
  ),
};

export function StatusBadge({
  status,
  className,
}: {
  status: ClaimStatus;
  className?: string;
}) {
  return (
    <span className={cn(STATUS_CLASSES[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}
