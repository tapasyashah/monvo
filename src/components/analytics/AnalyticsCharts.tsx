"use client";

import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlurFade } from "@/components/ui/blur-fade";
import WaterfallChart from "./WaterfallChart";
import DrillDownModal from "./DrillDownModal";
import {
  getWaterfallData,
  getCategoryTransactions,
  getAvailableMonths,
  type TxRow,
  type WaterfallBar,
  type DrillDownTransaction,
} from "@/lib/queries/analytics";

// ---------------------------------------------------------------------------
// Props — server-computed data passed in
// ---------------------------------------------------------------------------

interface AnalyticsChartsProps {
  /** Raw transaction rows (already fetched server-side) */
  transactions: TxRow[];
  /** Indices of internal transfer rows to exclude */
  internalTransferIndices: number[];
  /** Top merchants for the bar chart (all-time, pre-computed server-side) */
  topMerchants: { merchant: string; total: number }[];
}

// ---------------------------------------------------------------------------
// Shared chart styles (matching SpendingCharts)
// ---------------------------------------------------------------------------

const tickStyle = { fill: "#8888A8", fontSize: 12 };

const tooltipStyle = {
  contentStyle: {
    background: "#111118",
    border: "1px solid #2A2A38",
    borderRadius: 8,
  },
  labelStyle: { color: "#8888A8" },
};

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

function formatDollarAxis(v: unknown): string {
  if (typeof v === "number") return "$" + v.toLocaleString("en-CA");
  return String(v);
}

function formatMonthLabel(value: string): string {
  const [y, m] = value.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-CA", {
    month: "short",
    year: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsCharts({
  transactions,
  internalTransferIndices,
  topMerchants,
}: AnalyticsChartsProps) {
  const transferSet = useMemo(
    () => new Set(internalTransferIndices),
    [internalTransferIndices],
  );

  // Available months
  const months = useMemo(
    () => getAvailableMonths(transactions),
    [transactions],
  );

  // Default to most recent month
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => months[months.length - 1] ?? "",
  );

  // Waterfall data for selected month
  const waterfallData: WaterfallBar[] = useMemo(
    () =>
      selectedMonth
        ? getWaterfallData(transactions, selectedMonth, transferSet)
        : [],
    [transactions, selectedMonth, transferSet],
  );

  const totalIncome = useMemo(
    () => waterfallData.find((b) => b.type === "income")?.value ?? 0,
    [waterfallData],
  );

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    category: string;
    total: number;
    transactions: DrillDownTransaction[];
  } | null>(null);

  const handleCategoryClick = useCallback(
    (categoryKey: string) => {
      const bar = waterfallData.find((b) => b.categoryKey === categoryKey);
      if (!bar) return;

      const txs = getCategoryTransactions(
        transactions,
        categoryKey,
        selectedMonth,
        transferSet,
      );

      setDrillDown({
        category: categoryKey,
        total: bar.value,
        transactions: txs,
      });
    },
    [waterfallData, transactions, selectedMonth, transferSet],
  );

  const merchantHeight = Math.max(260, topMerchants.length * 38);

  return (
    <div className="space-y-6">
      {/* Waterfall Chart — Category Cash Flow */}
      <BlurFade delay={0} inView>
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="px-6 pb-2 pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                Cash Flow Waterfall
              </CardTitle>

              {/* Month Selector */}
              {months.length > 0 && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {waterfallData.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                No data for this month.
              </p>
            ) : (
              <WaterfallChart
                data={waterfallData}
                totalIncome={totalIncome}
                onCategoryClick={handleCategoryClick}
              />
            )}
          </CardContent>
        </Card>
      </BlurFade>

      {/* Top Merchants — kept as horizontal bar chart */}
      <BlurFade delay={0.1} inView>
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">
              Top Merchants
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={merchantHeight}>
              <BarChart
                data={topMerchants}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
              >
                <CartesianGrid stroke="#2A2A38" vertical={false} />
                <XAxis
                  type="number"
                  tick={tickStyle}
                  tickFormatter={formatDollarAxis}
                />
                <YAxis
                  dataKey="merchant"
                  type="category"
                  width={170}
                  tick={tickStyle}
                />
                <Tooltip formatter={formatDollar} {...tooltipStyle} />
                <Bar dataKey="total" fill="#6366f1" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Drill-down modal */}
      {drillDown && (
        <DrillDownModal
          open={true}
          category={drillDown.category}
          total={drillDown.total}
          transactions={drillDown.transactions}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
