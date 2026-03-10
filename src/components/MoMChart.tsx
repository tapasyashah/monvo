"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MoMChartProps {
  momChartData: Record<string, number | string>[];
  top5Cats: string[];
}

const CAT_COLORS = ["#6C63FF", "#00D2A0", "#F59E0B", "#EF4444", "#8B5CF6"];

const tooltipStyle = {
  contentStyle: {
    background: "#111118",
    border: "1px solid #2A2A38",
    borderRadius: 8,
  },
  labelStyle: { color: "#8888A8" },
};

function formatDollarAxis(v: unknown): string {
  if (typeof v === "number") return "$" + v.toLocaleString("en-CA");
  return String(v);
}

function formatDollar(v: unknown): string {
  if (typeof v === "number")
    return (
      "$" +
      v.toLocaleString("en-CA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  return String(v);
}

export default function MoMChart({ momChartData, top5Cats }: MoMChartProps): React.JSX.Element {
  // Compute MoM change badges: compare last two months for each top category
  const lastIdx = momChartData.length - 1;
  const prevIdx = momChartData.length - 2;

  const badges = top5Cats.map((cat, i) => {
    const lastVal = lastIdx >= 0 ? (momChartData[lastIdx]?.[cat] as number) ?? 0 : 0;
    const prevVal = prevIdx >= 0 ? (momChartData[prevIdx]?.[cat] as number) ?? 0 : 0;

    let badge: React.JSX.Element;
    if (prevVal === 0 && lastVal === 0) {
      badge = (
        <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-[#2A2A38] text-[#8888A8]">
          —
        </span>
      );
    } else if (prevVal === 0) {
      badge = (
        <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-red-900/30 text-red-400">
          new
        </span>
      );
    } else {
      const pct = Math.round(((lastVal - prevVal) / prevVal) * 100);
      if (pct <= 0) {
        badge = (
          <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-emerald-900/30 text-emerald-400">
            ↓ {Math.abs(pct)}%
          </span>
        );
      } else {
        badge = (
          <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-red-900/30 text-red-400">
            ↑ {pct}%
          </span>
        );
      }
    }

    return (
      <div key={cat} className="flex items-center gap-1 text-xs text-[#8888A8]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: CAT_COLORS[i] ?? "#8888A8" }}
        />
        <span className="truncate max-w-[120px]" title={cat}>
          {cat}
        </span>
        {badge}
      </div>
    );
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={momChartData}
          margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
        >
          <XAxis
            dataKey="month"
            tick={{ fill: "#8888A8", fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: "#8888A8", fontSize: 12 }}
            tickFormatter={formatDollarAxis}
          />
          <Tooltip
            formatter={(v: unknown) => formatDollar(v)}
            {...tooltipStyle}
          />
          <Legend wrapperStyle={{ color: "#8888A8", fontSize: 12 }} />
          {top5Cats.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              fill={CAT_COLORS[i] ?? "#8888A8"}
              radius={2}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {badges}
        </div>
      )}
    </>
  );
}

// React import needed for JSX return type annotation in strict mode
import React from "react";
