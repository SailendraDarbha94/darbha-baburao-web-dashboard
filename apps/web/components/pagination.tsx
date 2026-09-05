import Link from "next/link";
import type { AdminClaimsQuery } from "@claims/shared";
import { buttonVariants } from "@/components/ui/button";
import { claimsListHref } from "@/lib/claims-url";
import { cn } from "@/lib/utils";

// Offset pagination (docs/PLAN.md decision k): previous/next links plus the position. per_page comes
// from the query (default 25) and is preserved by claimsListHref.
export function Pagination({
  query,
  total,
}: {
  query: AdminClaimsQuery;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / query.per_page));
  const hasPrev = query.page > 1;
  const hasNext = query.page < pageCount;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 text-sm"
    >
      <p className="text-muted-foreground">
        Page {query.page} of {pageCount} · {total}{" "}
        {total === 1 ? "claim" : "claims"}
      </p>
      <div className="flex items-center gap-2">
        <PageLink
          href={claimsListHref(query, { page: query.page - 1 })}
          enabled={hasPrev}
        >
          Previous
        </PageLink>
        <PageLink
          href={claimsListHref(query, { page: query.page + 1 })}
          enabled={hasNext}
        >
          Next
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  enabled,
  children,
}: {
  href: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const className = buttonVariants({ variant: "outline", size: "sm" });
  if (!enabled) {
    return (
      <span aria-disabled="true" className={cn(className, "opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
