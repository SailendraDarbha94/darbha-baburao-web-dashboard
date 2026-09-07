"use client";

import type { TooltipContentProps } from "recharts";

// Recharts' default tooltip hard-codes a white background and black text, which is unreadable in dark
// mode. This replacement is the app's own popover surface, so it follows the theme like everything else.
// Passed as `content={ChartTooltipContent}` — Recharts calls it with the hovered payload.
export function ChartTooltipContent({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || payload.length === 0) return null;

  return (
    <div className="rounded-lg bg-popover px-2.5 py-1.5 text-xs text-popover-foreground ring-1 ring-foreground/10">
      {label === undefined ? null : (
        <p className="mb-1 font-medium">{String(label)}</p>
      )}
      <ul className="flex flex-col gap-0.5">
        {payload.map((entry, index) => (
          <li
            key={`${String(entry.name ?? "")}-${String(index)}`}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{String(entry.name)}</span>
            <span className="ml-auto pl-2 tabular-nums">
              {formatValue(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// A payload value is `number | string | ReadonlyArray<number | string>`; every chart here plots counts,
// but the type is what it is, so collapse it to a string rather than rendering an array.
function formatValue(
  value: number | string | readonly (number | string)[] | undefined,
): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}
