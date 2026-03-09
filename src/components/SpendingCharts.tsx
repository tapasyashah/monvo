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

interface Props {
  spendByCategory: { category: string; total: number }[];
  monthlyFlow: { month: string; spent: number; received: number }[];
  topMerchants: { merchant: string; total: number }[];
}

const tickStyle = { fill: "#a3a3a3", fontSize: 12 };

const tooltipStyle = {
  contentStyle: {
    background: "#171717",
    border: "1px solid #262626",
    borderRadius: 8,
  },
  labelStyle: { color: "#a3a3a3" },
};

function formatDollar(v: unknown): string {
  if (typeof v === "number")
    return "$" + v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    <div className="space-y-8">
      {/* Chart 1 — Spending by Category */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-200">
          Spending by Category
        </h2>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <ResponsiveContainer width="100%" height={categoryHeight}>
            <BarChart
              data={spendByCategory}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke="#262626" vertical={false} />
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
              <Tooltip
                formatter={formatDollar}
                {...tooltipStyle}
              />
              <Bar dataKey="total" fill="#8b5cf6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 2 — Monthly Cash Flow */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-200">
          Monthly Cash Flow
        </h2>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={monthlyFlow}
              margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke="#262626" />
              <XAxis
                dataKey="month"
                tick={tickStyle}
                tickFormatter={formatMonth}
              />
              <YAxis
                tick={tickStyle}
                tickFormatter={formatDollarAxis}
              />
              <Tooltip
                formatter={formatDollar}
                labelFormatter={(label: unknown) =>
                  typeof label === "string" ? formatMonth(label) : String(label)
                }
                {...tooltipStyle}
              />
              <Legend
                wrapperStyle={{ color: "#a3a3a3", fontSize: 12 }}
              />
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
                stroke="#34d399"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Chart 3 — Top Merchants */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-200">
          Top Merchants
        </h2>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <ResponsiveContainer width="100%" height={merchantHeight}>
            <BarChart
              data={topMerchants}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke="#262626" vertical={false} />
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
              <Tooltip
                formatter={formatDollar}
                {...tooltipStyle}
              />
              <Bar dataKey="total" fill="#6366f1" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
