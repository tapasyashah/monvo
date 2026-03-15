"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCashFlow, type CashFlowMonth } from "@/lib/hooks/useCashFlow";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = "this_month" | "last_month" | "three_month_avg";

interface BreakdownSegment {
  name: string;
  value: number;
  color: string;
  percent: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatPercent(value: number): string {
  if (!isFinite(value)) return "--";
  return `${Math.round(value)}%`;
}

function buildBreakdown(month: CashFlowMonth): BreakdownSegment[] {
  const income = month.total_income;
  if (income <= 0) return [];

  const segments: BreakdownSegment[] = [];

  if (month.true_spending > 0) {
    segments.push({
      name: "Spending",
      value: month.true_spending,
      color: "#6C63FF",
      percent: (month.true_spending / income) * 100,
    });
  }

  if (month.business_spending > 0) {
    segments.push({
      name: "Business",
      value: month.business_spending,
      color: "#8B5CF6",
      percent: (month.business_spending / income) * 100,
    });
  }

  if (month.investment_contributions > 0) {
    segments.push({
      name: "Investments",
      value: month.investment_contributions,
      color: "#3B82F6",
      percent: (month.investment_contributions / income) * 100,
    });
  }

  if (month.transfer_total > 0) {
    // Transfers not already captured in other segments
    const otherTotal = segments.reduce((s, seg) => s + seg.value, 0);
    const transferRemainder = Math.max(
      0,
      month.transfer_total - month.investment_contributions
    );
    if (transferRemainder > 0) {
      segments.push({
        name: "Transfers",
        value: transferRemainder,
        color: "#64748B",
        percent: (transferRemainder / income) * 100,
      });
    }
    // Recalculate surplus from remaining
    void otherTotal;
  }

  // Surplus / deficit as last segment
  const allocated = segments.reduce((s, seg) => s + seg.value, 0);
  const surplus = income - allocated;
  if (Math.abs(surplus) > 0.5) {
    segments.push({
      name: surplus >= 0 ? "Surplus" : "Deficit",
      value: Math.abs(surplus),
      color: surplus >= 0 ? "#34D399" : "#F87171",
      percent: (Math.abs(surplus) / income) * 100,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  colorClass,
  prefix,
}: {
  label: string;
  value: number;
  colorClass: string;
  prefix?: string;
}) {
  return (
    <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${colorClass}`}>
        {prefix}
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function BreakdownBar({ segments }: { segments: BreakdownSegment[] }) {
  if (segments.length === 0) return null;

  // Build a single data row for a horizontal stacked bar
  const dataRow: Record<string, string | number> = { name: "breakdown" };
  segments.forEach((seg) => {
    dataRow[seg.name] = seg.value;
  });

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <ResponsiveContainer width="100%" height={36}>
        <BarChart
          data={[dataRow]}
          layout="horizontal"
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          barCategoryGap={0}
        >
          <XAxis type="number" hide domain={[0, "dataMax"] as const} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "#111118",
              border: "1px solid #2A2A38",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#8888A8" }}
            formatter={(val: unknown, name: unknown) => [
              formatCurrency(Number(val)),
              String(name),
            ]}
          />
          {segments.map((seg) => (
            <Bar
              key={seg.name}
              dataKey={seg.name}
              stackId="stack"
              radius={0}
            >
              <Cell fill={seg.color} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.name} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-[var(--muted-foreground)]">
              {seg.name}{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatPercent(seg.percent)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonLine({
  current,
  previous,
}: {
  current: CashFlowMonth;
  previous: CashFlowMonth;
}) {
  const delta = current.true_spending - previous.true_spending;
  const pct =
    previous.true_spending > 0
      ? (delta / previous.true_spending) * 100
      : 0;

  const isUp = delta > 0;
  const arrow = isUp ? "\u2191" : "\u2193";
  const colorClass = isUp ? "text-red-400" : "text-emerald-400";

  // Format previous month name
  const prevDate = new Date(previous.month);
  const prevLabel = prevDate.toLocaleDateString("en-CA", { month: "long" });

  return (
    <div className="rounded-lg bg-[var(--primary)]/5 px-3 py-2">
      <p className="text-xs text-[var(--muted-foreground)]">
        vs. {prevLabel}:{" "}
        <span className={`font-medium ${colorClass}`}>
          spending {arrow} {formatCurrency(Math.abs(delta))} (
          {isUp ? "+" : ""}
          {formatPercent(pct)})
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const tabs: { key: TabKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "three_month_avg", label: "3-month avg" },
];

export default function CashFlowPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("this_month");
  const { data, isLoading, error, currentMonth, previousMonth, threeMonthAvg } =
    useCashFlow(3, "personal_only");

  const selectedMonth: CashFlowMonth | null = useMemo(() => {
    switch (activeTab) {
      case "this_month":
        return currentMonth;
      case "last_month":
        return previousMonth;
      case "three_month_avg":
        return threeMonthAvg;
      default:
        return currentMonth;
    }
  }, [activeTab, currentMonth, previousMonth, threeMonthAvg]);

  const comparisonBase: CashFlowMonth | null = useMemo(() => {
    if (activeTab === "this_month" && previousMonth) return previousMonth;
    if (activeTab === "last_month" && data.length >= 3) return data[data.length - 3];
    return null;
  }, [activeTab, previousMonth, data]);

  const breakdown = useMemo(
    () => (selectedMonth ? buildBreakdown(selectedMonth) : []),
    [selectedMonth]
  );

  const surplusPrefix =
    selectedMonth && selectedMonth.surplus_deficit >= 0 ? "+" : "-";
  const surplusColor =
    selectedMonth && selectedMonth.surplus_deficit >= 0
      ? "text-emerald-400"
      : "text-red-400";

  return (
    <Card className="border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[var(--primary)]/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Cash Flow
        </CardTitle>
        <div className="rounded-lg p-2 bg-[var(--accent)]/10">
          <DollarSign className="size-4 text-[var(--accent)]" />
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {/* Row 1: Month selector tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-[var(--primary)]/5 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <p className="py-4 text-sm text-red-400">
            Failed to load cash flow: {error}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !error && !selectedMonth && (
          <p className="py-4 text-sm text-[var(--muted-foreground)]">
            No transaction data available. Upload a statement to see your cash
            flow.
          </p>
        )}

        {/* Data state */}
        {!isLoading && !error && selectedMonth && (
          <div className="space-y-4">
            {/* Row 2: Three metric cards */}
            <div className="flex gap-3">
              <MetricCard
                label="Income"
                value={selectedMonth.total_income}
                colorClass="text-[#00E5BE]"
              />
              <MetricCard
                label="Spent"
                value={selectedMonth.true_spending}
                colorClass="text-[var(--foreground)]"
              />
              <MetricCard
                label={selectedMonth.surplus_deficit >= 0 ? "Surplus" : "Deficit"}
                value={Math.abs(selectedMonth.surplus_deficit)}
                colorClass={surplusColor}
                prefix={surplusPrefix}
              />
            </div>

            {/* Savings rate badge */}
            <div className="flex items-center gap-2">
              {selectedMonth.savings_rate >= 0 ? (
                <TrendingUp className="size-3.5 text-emerald-400" />
              ) : selectedMonth.savings_rate < 0 ? (
                <TrendingDown className="size-3.5 text-red-400" />
              ) : (
                <Minus className="size-3.5 text-[var(--muted-foreground)]" />
              )}
              <span
                className={`text-xs font-semibold tabular-nums ${
                  selectedMonth.savings_rate >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {formatPercent(selectedMonth.savings_rate)} savings rate
              </span>
            </div>

            {/* Row 3: Breakdown bar */}
            {breakdown.length > 0 && <BreakdownBar segments={breakdown} />}

            {/* Row 4: Comparison line */}
            {comparisonBase && selectedMonth && (
              <ComparisonLine
                current={selectedMonth}
                previous={comparisonBase}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
