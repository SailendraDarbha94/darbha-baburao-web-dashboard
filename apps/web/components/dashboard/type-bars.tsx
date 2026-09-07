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
import { ChartTooltipContent } from "@/components/dashboard/chart-tooltip";
import {
  ACCENT_COLOR,
  AXIS_OPACITY,
  CURSOR_OPACITY,
  GRID_OPACITY,
} from "@/components/dashboard/palette";

// Recharts' entry animation renders only its first frame and never advances under React 19: bars came out
// ~3px tall and pie sectors with a near-zero sweep. A dashboard does not need the animation, and the
// isAnimationActive={false} below removes the failure mode entirely.

export type TypeBar = { name: string; value: number };

// Claims by type. One measure, so one colour; the axis labels and grid inherit `currentColor` from the
// wrapper's text colour, which is how the chart follows the light/dark theme without any JavaScript.
export function TypeBars({ data }: { data: readonly TypeBar[] }) {
  return (
    <div className="h-56 w-full text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...data]}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="currentColor"
            strokeOpacity={GRID_OPACITY}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "currentColor", strokeOpacity: AXIS_OPACITY }}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={ChartTooltipContent}
            cursor={{ fill: "currentColor", fillOpacity: CURSOR_OPACITY }}
          />
          <Bar
            isAnimationActive={false}
            name="Claims"
            dataKey="value"
            fill={ACCENT_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={64}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
