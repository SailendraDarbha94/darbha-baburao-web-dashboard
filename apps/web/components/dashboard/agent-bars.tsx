"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClaimStatus } from "@claims/shared";
import { ChartTooltipContent } from "@/components/dashboard/chart-tooltip";
import {
  AXIS_OPACITY,
  CURSOR_OPACITY,
  GRID_OPACITY,
} from "@/components/dashboard/palette";

// Recharts' entry animation renders only its first frame and never advances under React 19: bars came out
// ~3px tall and pie sectors with a near-zero sweep. A dashboard does not need the animation, and the
// isAnimationActive={false} below removes the failure mode entirely.

/** One agent: their display name plus a count for every status (zeroes included). */
export type AgentBarRow = { agent: string } & Record<ClaimStatus, number>;

/** The stack order, top to bottom of the legend, with the label and colour resolved on the server. */
export type AgentBarSeries = {
  status: ClaimStatus;
  label: string;
  color: string;
};

// Rough per-row height for the horizontal bars, plus room for the axis.
const ROW_HEIGHT = 36;
const AXIS_HEIGHT = 32;

// Claims per agent, stacked by status. Horizontal because agent names are long and a rotated x-axis is
// harder to read than a left-aligned list; the stack stays legible because there are at most six segments
// and the page only passes the busiest agents.
export function AgentBars({
  data,
  series,
}: {
  data: readonly AgentBarRow[];
  series: readonly AgentBarSeries[];
}) {
  const height = Math.max(176, data.length * ROW_HEIGHT + AXIS_HEIGHT);

  return (
    <div className="flex flex-col gap-3 text-muted-foreground">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data]}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke="currentColor"
              strokeOpacity={GRID_OPACITY}
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "currentColor", strokeOpacity: AXIS_OPACITY }}
            />
            <YAxis
              type="category"
              dataKey="agent"
              width={120}
              tick={{ fill: "currentColor", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={ChartTooltipContent}
              cursor={{ fill: "currentColor", fillOpacity: CURSOR_OPACITY }}
            />
            {series.map((entry) => (
              <Bar
                isAnimationActive={false}
                key={entry.status}
                name={entry.label}
                dataKey={entry.status}
                stackId="claims"
                fill={entry.color}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {series.map((entry) => (
          <li key={entry.status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
