"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipContent } from "@/components/dashboard/chart-tooltip";

// Recharts' entry animation renders only its first frame and never advances under React 19: bars came out
// ~3px tall and pie sectors with a near-zero sweep. A dashboard does not need the animation, and the
// isAnimationActive={false} below removes the failure mode entirely.

export type StatusSlice = {
  /** Human status label, e.g. "Under review". */
  name: string;
  value: number;
  /** Fill colour, resolved on the server from components/dashboard/palette.ts. */
  fill: string;
};

// Claims by status, as a donut. Every prop is already aggregated and serialisable: the page is a Server
// Component and does all the counting; this file exists only because Recharts needs the DOM.
export function StatusDonut({ data }: { data: readonly StatusSlice[] }) {
  // A zero-count status has no sector to draw, but it stays in the legend below so "nothing is approved
  // yet" reads as a real fact rather than a missing row.
  const sectors = data.filter((slice) => slice.value > 0);

  return (
    <div className="flex flex-col gap-3 text-muted-foreground">
      {/* ResponsiveContainer measures its parent, so the parent needs a real height. */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={[...sectors]}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="none"
            />
            <Tooltip content={ChartTooltipContent} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: slice.fill }}
            />
            <span>{slice.name}</span>
            <span className="font-medium text-foreground tabular-nums">
              {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
