"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { WaterfallBar } from "@/lib/queries/analytics";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WaterfallChartProps {
  data: WaterfallBar[];
  totalIncome: number;
  onCategoryClick?: (categoryKey: string) => void;
}

// ---------------------------------------------------------------------------
// Colors matching Monvo palette
// ---------------------------------------------------------------------------

const BAR_COLORS: Record<WaterfallBar["type"], string> = {
  income: "#00E5BE",   // teal
  expense: "#6C63FF",  // purple
  surplus: "#34d399",  // emerald-400
  deficit: "#f87171",  // red-400
};

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function WaterfallTooltip({
  active,
  payload,
  totalIncome,
}: { active?: boolean; payload?: Array<{ payload: WaterfallBar }>; totalIncome: number }) {
  if (!active || !payload?.[0]) return null;
  const bar = payload[0].payload;
  const pct = totalIncome > 0 ? ((bar.value / totalIncome) * 100).toFixed(1) : "0.0";

  return (
    <div
      className="rounded-lg border border-[#2A2A38] bg-[#111118] px-3 py-2 text-xs shadow-lg"
    >
      <p className="mb-1 font-medium text-[var(--foreground)]">{bar.name}</p>
      <p className="text-[var(--muted-foreground)]">
        ${bar.value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-[var(--muted-foreground)]">{pct}% of income</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recharts waterfall via stacked bars
//
// Each bar is rendered as two stacked segments:
//   - "invisible": transparent spacer from 0 up to where the visible bar starts
//   - "visible":   the coloured bar segment
//
// For income: invisible = 0, visible = value (bar goes 0 → value)
// For expenses: invisible = runningTotal, visible = value (bar goes runningTotal → runningTotal+value)
// For surplus/deficit: invisible = 0, visible = runningTotal (shows remaining)
// ---------------------------------------------------------------------------

interface StackedRow {
  name: string;
  invisible: number;
  visible: number;
  type: WaterfallBar["type"];
  categoryKey: string;
  value: number;
}

function toStackedRows(bars: WaterfallBar[]): StackedRow[] {
  return bars.map((bar) => {
    if (bar.type === "income") {
      return {
        name: bar.name,
        invisible: 0,
        visible: bar.value,
        type: bar.type,
        categoryKey: bar.categoryKey,
        value: bar.value,
      };
    }
    if (bar.type === "expense") {
      return {
        name: bar.name,
        invisible: bar.runningTotal,
        visible: bar.value,
        type: bar.type,
        categoryKey: bar.categoryKey,
        value: bar.value,
      };
    }
    // surplus or deficit
    return {
      name: bar.name,
      invisible: 0,
      visible: Math.abs(bar.runningTotal),
      type: bar.type,
      categoryKey: bar.categoryKey,
      value: bar.value,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const tickStyle = { fill: "#8888A8", fontSize: 12 };

export default function WaterfallChart({
  data,
  totalIncome,
  onCategoryClick,
}: WaterfallChartProps) {
  const stacked = toStackedRows(data);

  const handleClick = (entry: StackedRow) => {
    if (
      onCategoryClick &&
      entry.categoryKey !== "__surplus__" &&
      entry.categoryKey !== "__deficit__"
    ) {
      onCategoryClick(entry.categoryKey);
    }
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, stacked.length * 48)}>
      <BarChart
        data={stacked}
        layout="vertical"
        margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
      >
        <CartesianGrid stroke="#2A2A38" vertical={false} />
        <XAxis
          type="number"
          tick={tickStyle}
          tickFormatter={(v: number) => "$" + v.toLocaleString("en-CA")}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={140}
          tick={tickStyle}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content={(props: any) => <WaterfallTooltip active={props.active} payload={props.payload} totalIncome={totalIncome} />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />

        {/* Invisible spacer bar */}
        <Bar dataKey="invisible" stackId="waterfall" fill="transparent" isAnimationActive={false} />

        {/* Visible coloured bar */}
        <Bar
          dataKey="visible"
          stackId="waterfall"
          radius={4}
          cursor="pointer"
          onClick={(_data: unknown, index: number) => handleClick(stacked[index])}
        >
          {stacked.map((entry, idx) => (
            <Cell key={idx} fill={BAR_COLORS[entry.type]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
