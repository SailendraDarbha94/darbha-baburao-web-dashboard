import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The frame every dashboard chart sits in: a card with a title, a one-line description and either the
// chart or an empty state. Kept a Server Component — only the chart bodies need "use client".
//
// `min-w-0` matters: these are grid children, and a grid item's default `min-width: auto` would let a
// wide chart push the column (and the page) past the viewport instead of shrinking.
export function ChartCard({
  title,
  description,
  isEmpty,
  emptyLabel = "No claims yet",
  className,
  children,
}: {
  title: string;
  description: string;
  isEmpty: boolean;
  emptyLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {isEmpty ? (
          <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
