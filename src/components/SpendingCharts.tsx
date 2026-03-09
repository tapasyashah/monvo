"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlurFade } from "@/components/ui/blur-fade";

interface Props {
  spendByCategory: { category: string; total: number }[];
  monthlyFlow: { month: string; spent: number; received: number }[];
  topMerchants: { merchant: string; total: number }[];
}

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

function formatMonth(value: string): string {
  const [y, m] = value.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-CA", {
    month: "short",
    year: "2-digit",
  });
}

export default function SpendingCharts({
  spendByCategory,
  monthlyFlow,
  topMerchants,
}: Props) {
  const categoryHeight = Math.max(260, spendByCategory.length * 38);
  const merchantHeight = Math.max(260, topMerchants.length * 38);

  return (
    <div className="space-y-6">
      {/* Chart 1 — Spending by Category */}
      <BlurFade delay={0} inView>
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={categoryHeight}>
              <BarChart
                data={spendByCategory}
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
                  dataKey="category"
                  type="category"
                  width={140}
                  tick={tickStyle}
                />
                <Tooltip formatter={formatDollar} {...tooltipStyle} />
                <Bar dataKey="total" fill="#6C63FF" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Chart 2 — Monthly Cash Flow */}
      <BlurFade delay={0.1} inView>
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="px-6 pb-2 pt-6">
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">
              Monthly Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={monthlyFlow}
                margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
              >
                <CartesianGrid stroke="#2A2A38" />
                <XAxis
                  dataKey="month"
                  tick={tickStyle}
                  tickFormatter={formatMonth}
                />
                <YAxis tick={tickStyle} tickFormatter={formatDollarAxis} />
                <Tooltip
                  formatter={formatDollar}
                  labelFormatter={(label: unknown) =>
                    typeof label === "string" ? formatMonth(label) : String(label)
                  }
                  {...tooltipStyle}
                />
                <Legend wrapperStyle={{ color: "#8888A8", fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="spent"
                  stroke="#f87171"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="received"
                  stroke="#00D2A0"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Chart 3 — Top Merchants */}
      <BlurFade delay={0.2} inView>
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
    </div>
  );
}
