"use client";

import React, { useState } from "react";
import type { MonthComparisonResult } from "@/lib/hooks/useSpendVelocity";

interface MonthComparisonBarProps {
  comparison: MonthComparisonResult;
}

function formatDollar(v: number): string {
  return (
    "$" +
    v.toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function MonthComparisonBar({
  comparison,
}: MonthComparisonBarProps): React.JSX.Element {
  const [showAvg, setShowAvg] = useState(false);
  const { thisMonthTotal, lastMonthTotal, delta, deltaPercent, avg3MonthTotal, direction } =
    comparison;

  // Green = spending down (good), red = spending up
  const deltaColor =
    direction === "down"
      ? "text-emerald-400"
      : direction === "up"
        ? "text-red-400"
        : "text-[var(--muted-foreground)]";
  const deltaBg =
    direction === "down"
      ? "bg-emerald-900/30"
      : direction === "up"
        ? "bg-red-900/30"
        : "bg-[#2A2A38]";

  const sign = delta >= 0 ? "+" : "";
  const pctSign = deltaPercent >= 0 ? "+" : "";

  // vs 3-month avg
  const avgDelta = thisMonthTotal - avg3MonthTotal;
  const avgDeltaPct =
    avg3MonthTotal > 0 ? Math.round((avgDelta / avg3MonthTotal) * 10000) / 100 : 0;
  const avgDirection = avgDeltaPct > 2 ? "up" : avgDeltaPct < -2 ? "down" : "flat";
  const avgColor =
    avgDirection === "down"
      ? "text-emerald-400"
      : avgDirection === "up"
        ? "text-red-400"
        : "text-[var(--muted-foreground)]";

  return (
    <div className="sticky top-0 z-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          {/* This month */}
          <div>
            <span className="text-[var(--muted-foreground)]">This month: </span>
            <span className="font-semibold text-[var(--foreground)]">
              {formatDollar(thisMonthTotal)}
            </span>
          </div>

          {/* Separator */}
          <span className="hidden text-[var(--border)] sm:inline">|</span>

          {/* Last month */}
          <div>
            <span className="text-[var(--muted-foreground)]">Last month: </span>
            <span className="font-semibold text-[var(--foreground)]">
              {formatDollar(lastMonthTotal)}
            </span>
          </div>

          {/* Separator */}
          <span className="hidden text-[var(--border)] sm:inline">|</span>

          {/* Delta */}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${deltaBg} ${deltaColor}`}>
            {sign}
            {formatDollar(Math.abs(delta))} ({pctSign}
            {deltaPercent.toFixed(1)}%)
          </span>
        </div>

        {/* Toggle for 3-month avg */}
        <button
          onClick={() => setShowAvg((prev) => !prev)}
          className="text-xs text-[var(--muted-foreground)] underline decoration-dotted hover:text-[var(--foreground)] transition-colors"
        >
          {showAvg ? "Hide avg" : "vs 3-month avg"}
        </button>
      </div>

      {showAvg && avg3MonthTotal > 0 && (
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <span>
            3-month avg:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {formatDollar(avg3MonthTotal)}
            </span>
          </span>
          <span className={avgColor}>
            {avgDelta >= 0 ? "+" : ""}
            {formatDollar(Math.abs(avgDelta))} ({avgDeltaPct >= 0 ? "+" : ""}
            {avgDeltaPct.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}
