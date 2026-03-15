"use client";

import React, { useMemo } from "react";
import type { DailySpendData } from "@/lib/queries/heatmap";

// ---------------------------------------------------------------------------
// P2-C: Spend Heatmap — calendar view revealing daily spending patterns
// ---------------------------------------------------------------------------

interface SpendHeatmapProps {
  days: DailySpendData[];
  averageDailySpend: number;
  /** YYYY-MM format */
  month: string;
}

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/**
 * Color intensity based on spend relative to user's daily average.
 * Monvo palette: #0B1D35 (navy) → #00E5BE (teal).
 */
function getHeatColor(spent: number, avg: number): string {
  if (spent === 0) return "rgba(255,255,255,0.03)";
  if (avg === 0) return "#00E5BE";

  const ratio = spent / avg;

  if (ratio <= 0.5) return "rgba(0, 229, 190, 0.15)";
  if (ratio <= 1.0) return "rgba(0, 229, 190, 0.35)";
  if (ratio <= 2.0) return "rgba(0, 229, 190, 0.6)";
  return "#00E5BE"; // 200%+ — full teal
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}

export default function SpendHeatmap({
  days,
  averageDailySpend,
  month,
}: SpendHeatmapProps): React.JSX.Element {
  const grid = useMemo(() => {
    if (days.length === 0) return [];

    // Sort by date
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

    // Determine starting day-of-week for padding
    const firstDate = new Date(sorted[0].date + "T00:00:00");
    const startDow = firstDate.getDay(); // 0=Sun

    // Build rows of 7 cells
    const cells: Array<DailySpendData | null> = [];

    // Pad leading empty cells
    for (let i = 0; i < startDow; i++) cells.push(null);

    // Fill real days
    for (const day of sorted) cells.push(day);

    // Pad trailing empty cells to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    // Chunk into weeks
    const weeks: Array<Array<DailySpendData | null>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
  }, [days]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">
        Spending Calendar
      </h2>
      <p className="mb-4 text-xs text-[var(--muted-foreground)]">
        {formatMonthLabel(month)} — darker cells = higher spend
      </p>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="aspect-square rounded-md" />;
              }

              const dayNum = Number(day.date.split("-")[2]);
              const bgColor = getHeatColor(day.total_spent, averageDailySpend);

              return (
                <div
                  key={di}
                  className="group relative aspect-square rounded-md transition-transform hover:scale-110"
                  style={{ backgroundColor: bgColor }}
                  title={`${day.date}: $${day.total_spent.toFixed(2)}`}
                >
                  {/* Day number */}
                  <span className="absolute left-1 top-0.5 text-[10px] font-medium text-[var(--foreground)] opacity-70">
                    {dayNum}
                  </span>

                  {/* Income dot */}
                  {day.has_income && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}

                  {/* Hover tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#2A2A38] bg-[#111118] px-3 py-2 text-xs shadow-lg group-hover:block">
                    <p className="font-medium text-[var(--foreground)]">
                      {day.date}
                    </p>
                    <p className="text-[var(--muted-foreground)]">
                      ${day.total_spent.toFixed(2)} · {day.transaction_count} txns
                    </p>
                    {day.top_merchant !== "—" && (
                      <p className="text-[var(--muted-foreground)]">
                        Top: {day.top_merchant}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
        <span>Less</span>
        {["rgba(255,255,255,0.03)", "rgba(0,229,190,0.15)", "rgba(0,229,190,0.35)", "rgba(0,229,190,0.6)", "#00E5BE"].map(
          (color, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ),
        )}
        <span>More</span>
        <span className="ml-3 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Income day
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notable Days list
// ---------------------------------------------------------------------------

interface NotableDaysProps {
  days: Array<DailySpendData & { multipleOfAvg: number }>;
}

export function NotableDays({ days }: NotableDaysProps): React.JSX.Element | null {
  if (days.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
        Notable Days
      </h3>
      <div className="space-y-2">
        {days.map((d) => (
          <div
            key={d.date}
            className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 px-4 py-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {new Date(d.date + "T00:00:00").toLocaleDateString("en-CA", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Top: {d.top_merchant}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                ${d.total_spent.toFixed(2)}
              </p>
              {d.multipleOfAvg > 1 && (
                <p className="text-xs text-red-400">
                  {d.multipleOfAvg.toFixed(1)}x your typical day
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
