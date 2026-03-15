"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { WeeklyDataPoint } from "@/lib/hooks/useSpendVelocity";

interface SpendVelocityChartProps {
  weeklyData: WeeklyDataPoint[];
  avgWeeklySpend: number;
  currentWeekPace: number;
  top3Categories: string[];
}

const CATEGORY_COLORS = ["#8B8BFF", "#F59E0B", "#EF4444"];
const TEAL = "#00E5BE";

function formatDollar(v: number): string {
  return "$" + v.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#2A2A38] bg-[#111118] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[#8888A8]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium text-[var(--foreground)]">
            {formatDollar(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SpendVelocityChart({
  weeklyData,
  avgWeeklySpend,
  currentWeekPace,
  top3Categories,
}: SpendVelocityChartProps): React.JSX.Element {
  const chartData = useMemo(
    () =>
      weeklyData.map((w) => {
        const point: Record<string, number | string> = {
          week: w.weekLabel,
          Total: w.total,
        };
        for (const cat of top3Categories) {
          point[cat] = w.byCategory[cat] ?? 0;
        }
        return point;
      }),
    [weeklyData, top3Categories]
  );

  const paceAboveAvg =
    avgWeeklySpend > 0
      ? ((currentWeekPace - avgWeeklySpend) / avgWeeklySpend) * 100
      : 0;
  const showWarning = paceAboveAvg > 20;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Spend Velocity
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Week-over-week spending trend (last {weeklyData.length} weeks)
          </p>
        </div>
        {showWarning && (
          <span className="rounded-full bg-red-900/30 px-3 py-1 text-xs font-medium text-red-400">
            This week is {Math.round(paceAboveAvg)}% above avg
          </span>
        )}
      </div>

      {weeklyData.length < 2 ? (
        <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          Need at least 2 weeks of data to show trends.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
          >
            <XAxis
              dataKey="week"
              tick={{ fill: "#8888A8", fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: "#8888A8", fontSize: 12 }}
              tickFormatter={(v: number) => formatDollar(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "#8888A8", fontSize: 12 }} />

            {/* Average reference line */}
            <ReferenceLine
              y={avgWeeklySpend}
              stroke="#8888A8"
              strokeDasharray="6 4"
              label={{
                value: `Avg: ${formatDollar(avgWeeklySpend)}`,
                fill: "#8888A8",
                fontSize: 11,
                position: "right",
              }}
            />

            {/* Total spend line — bold teal */}
            <Line
              type="monotone"
              dataKey="Total"
              stroke={TEAL}
              strokeWidth={2.5}
              dot={{ r: 3, fill: TEAL }}
              activeDot={{ r: 5 }}
            />

            {/* Top 3 category lines — muted colors */}
            {top3Categories.map((cat, i) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={CATEGORY_COLORS[i] ?? "#8888A8"}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                dot={{ r: 2, fill: CATEGORY_COLORS[i] ?? "#8888A8" }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Stats row */}
      <div className="mt-4 flex flex-wrap gap-6 text-xs text-[var(--muted-foreground)]">
        <div>
          <span className="text-[var(--foreground)] font-medium">
            {formatDollar(avgWeeklySpend)}
          </span>{" "}
          avg/week
        </div>
        <div>
          <span className="text-[var(--foreground)] font-medium">
            {formatDollar(currentWeekPace)}
          </span>{" "}
          this week so far
        </div>
      </div>
    </div>
  );
}
