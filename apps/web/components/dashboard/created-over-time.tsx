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

export type WeekBar = {
  /** Week label, already formatted on the server by lib/format.ts (en-GB, UTC). */
  label: string;
  value: number;
};

// Claims created per week. The bucket labels are formatted server-side so they cannot depend on the
// browser's locale or time zone — this component never touches Date.
export function CreatedOverTime({ data }: { data: readonly WeekBar[] }) {
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
            dataKey="label"
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "currentColor", strokeOpacity: AXIS_OPACITY }}
            // Narrow cards cannot fit twelve dates; Recharts drops the labels that would collide.
            minTickGap={16}
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
            name="Created"
            dataKey="value"
            fill={ACCENT_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
