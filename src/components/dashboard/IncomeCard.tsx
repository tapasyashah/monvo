import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatPercent(value: number): string {
  if (!isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

interface MonthSummary {
  income: number;
  trueSpending: number;
  surplus: number;
  savingsRate: number;
}

function computeSummary(
  transactions: { amount: number; category: string | null; transaction_type: string | null }[]
): MonthSummary {
  // Categories to exclude from "true spending" (not real expenses)
  const excludedCategories = new Set([
    "transfer",
    "transfers",
    "credit card payment",
    "cc payment",
    "investment",
    "investments",
  ]);

  // Income = sum of positive amounts that are credits and not internal transfers
  const income = transactions
    .filter((t) => {
      const isCredit = t.transaction_type === "credit" || t.amount > 0;
      const isTransfer = excludedCategories.has((t.category ?? "").toLowerCase());
      return isCredit && !isTransfer;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // True spending = sum of debits, excluding transfers/CC payments/investments
  const trueSpending = transactions
    .filter((t) => {
      const isDebit = t.transaction_type === "debit" || t.amount < 0;
      const isTransfer = excludedCategories.has((t.category ?? "").toLowerCase());
      return isDebit && !isTransfer;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const surplus = income - trueSpending;
  const savingsRate = income > 0 ? (surplus / income) * 100 : 0;

  return { income, trueSpending, surplus, savingsRate };
}

export default async function IncomeCard(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .split("T")[0];
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];

  // Fetch current and previous month transactions in parallel
  const [currentResult, prevResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category, transaction_type")
      .gte("date", currentMonthStart)
      .lt("date", nextMonthStart),
    supabase
      .from("transactions")
      .select("amount, category, transaction_type")
      .gte("date", prevMonthStart)
      .lt("date", currentMonthStart),
  ]);

  const currentTx = currentResult.data ?? [];
  const prevTx = prevResult.data ?? [];

  const current = computeSummary(currentTx);
  const prev = computeSummary(prevTx);

  const hasPrevData = prevTx.length > 0;
  const hasCurrentData = currentTx.length > 0;

  const monthLabel = now.toLocaleString("en-CA", { month: "long" });
  const prevMonthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString(
    "en-CA",
    { month: "long" }
  );

  const SurplusIcon = current.surplus >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[var(--primary)]/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          {monthLabel} Cash Flow
        </CardTitle>
        <div className="rounded-lg p-2 bg-[var(--primary)]/10">
          <DollarSign className="size-4 text-[var(--primary)]" />
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5">
        {!hasCurrentData ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No transactions this month yet. Upload a statement to see your cash flow.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Income row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">Income</span>
              <span className="text-lg font-semibold text-[var(--foreground)] tabular-nums">
                {formatCurrency(current.income)}
              </span>
            </div>

            {/* True spending row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">True spending</span>
              <span className="text-lg font-semibold text-[var(--foreground)] tabular-nums">
                {formatCurrency(current.trueSpending)}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Surplus / Deficit row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <SurplusIcon
                  className={`size-4 ${
                    current.surplus >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                />
                <span className="text-sm text-[var(--muted-foreground)]">
                  {current.surplus >= 0 ? "Surplus" : "Deficit"}
                </span>
              </div>
              <span
                className={`text-lg font-bold tabular-nums ${
                  current.surplus >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {current.surplus >= 0 ? "+" : "-"}
                {formatCurrency(current.surplus)}
              </span>
            </div>

            {/* Savings rate */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">Savings rate</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  current.savingsRate >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatPercent(current.savingsRate)}
              </span>
            </div>

            {/* Previous month comparison */}
            {hasPrevData && (
              <div className="mt-1 rounded-lg bg-[var(--primary)]/5 px-3 py-2">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {prevMonthLabel}: {formatCurrency(prev.income)} in,{" "}
                  {formatCurrency(prev.trueSpending)} out
                  <span
                    className={`ml-1 font-medium ${
                      prev.surplus >= 0 ? "text-emerald-400/70" : "text-red-400/70"
                    }`}
                  >
                    ({prev.surplus >= 0 ? "+" : "-"}
                    {formatCurrency(prev.surplus)})
                  </span>
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
