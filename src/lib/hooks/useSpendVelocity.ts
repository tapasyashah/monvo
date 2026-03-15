/**
 * Pure computation functions for spend velocity tracking.
 * No React hooks — analytics page is server-rendered, so these run server-side.
 */

export type TxRow = {
  date: string;
  amount: number;
  category: string | null;
  merchant_clean: string | null;
  expense_context?: string | null;
};

export type WeeklyDataPoint = {
  weekStart: string; // ISO date string (Monday of the week)
  weekLabel: string; // e.g. "Mar 3"
  total: number;
  byCategory: Record<string, number>;
};

export type SpendVelocityResult = {
  weeklyData: WeeklyDataPoint[];
  currentWeekPace: number;
  projectedMonthEnd: number;
  avgWeeklySpend: number;
  trendDirection: "up" | "down" | "flat";
  top3Categories: string[];
};

export type MonthComparisonResult = {
  thisMonthTotal: number;
  lastMonthTotal: number;
  delta: number;
  deltaPercent: number;
  avg3MonthTotal: number;
  direction: "up" | "down" | "flat";
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function computeSpendVelocity(
  transactions: TxRow[],
  weeks: number = 8
): SpendVelocityResult {
  // Filter to spend rows only
  const spendRows = transactions.filter((t) => t.amount < 0);

  // Group by week (Monday-based)
  const weekMap = new Map<string, { total: number; byCategory: Record<string, number> }>();

  for (const row of spendRows) {
    const monday = getMonday(new Date(row.date + "T00:00:00"));
    const key = monday.toISOString().slice(0, 10);
    if (!weekMap.has(key)) {
      weekMap.set(key, { total: 0, byCategory: {} });
    }
    const entry = weekMap.get(key)!;
    const amt = Math.abs(row.amount);
    entry.total += amt;
    const cat = row.category ?? "Uncategorized";
    entry.byCategory[cat] = (entry.byCategory[cat] ?? 0) + amt;
  }

  // Sort weeks descending and take last N
  const sortedWeeks = Array.from(weekMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, weeks)
    .reverse();

  const weeklyData: WeeklyDataPoint[] = sortedWeeks.map(([weekStart, data]) => ({
    weekStart,
    weekLabel: formatWeekLabel(weekStart),
    total: Math.round(data.total * 100) / 100,
    byCategory: Object.fromEntries(
      Object.entries(data.byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
  }));

  // Determine top 3 categories across all weeks
  const catTotals = new Map<string, number>();
  for (const w of weeklyData) {
    for (const [cat, amt] of Object.entries(w.byCategory)) {
      catTotals.set(cat, (catTotals.get(cat) ?? 0) + amt);
    }
  }
  const top3Categories = Array.from(catTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // Average weekly spend (excluding current incomplete week)
  const completedWeeks = weeklyData.slice(0, -1);
  const avgWeeklySpend =
    completedWeeks.length > 0
      ? Math.round(
          (completedWeeks.reduce((s, w) => s + w.total, 0) / completedWeeks.length) * 100
        ) / 100
      : 0;

  // Current week pace
  const currentWeekPace =
    weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].total : 0;

  // Projected month end: avg weekly * ~4.33
  const projectedMonthEnd = Math.round(avgWeeklySpend * 4.33 * 100) / 100;

  // Trend: compare last 2 completed weeks
  let trendDirection: "up" | "down" | "flat" = "flat";
  if (completedWeeks.length >= 2) {
    const recent = completedWeeks[completedWeeks.length - 1].total;
    const prior = completedWeeks[completedWeeks.length - 2].total;
    if (recent > prior * 1.05) trendDirection = "up";
    else if (recent < prior * 0.95) trendDirection = "down";
  }

  return {
    weeklyData,
    currentWeekPace,
    projectedMonthEnd,
    avgWeeklySpend,
    trendDirection,
    top3Categories,
  };
}

export function computeMonthComparison(transactions: TxRow[]): MonthComparisonResult {
  const spendRows = transactions.filter((t) => t.amount < 0);

  // Group by YYYY-MM
  const monthMap = new Map<string, number>();
  for (const row of spendRows) {
    const month = row.date.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + Math.abs(row.amount));
  }

  const sortedMonths = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  const thisMonthTotal =
    sortedMonths.length > 0
      ? Math.round(sortedMonths[sortedMonths.length - 1][1] * 100) / 100
      : 0;

  const lastMonthTotal =
    sortedMonths.length > 1
      ? Math.round(sortedMonths[sortedMonths.length - 2][1] * 100) / 100
      : 0;

  const delta = Math.round((thisMonthTotal - lastMonthTotal) * 100) / 100;
  const deltaPercent =
    lastMonthTotal > 0 ? Math.round((delta / lastMonthTotal) * 10000) / 100 : 0;

  // 3-month average (excluding current month)
  const prevMonths = sortedMonths.slice(-4, -1); // up to 3 months before current
  const avg3MonthTotal =
    prevMonths.length > 0
      ? Math.round(
          (prevMonths.reduce((s, [, v]) => s + v, 0) / prevMonths.length) * 100
        ) / 100
      : 0;

  let direction: "up" | "down" | "flat" = "flat";
  if (deltaPercent > 2) direction = "up";
  else if (deltaPercent < -2) direction = "down";

  return {
    thisMonthTotal,
    lastMonthTotal,
    delta,
    deltaPercent,
    avg3MonthTotal,
    direction,
  };
}
