import React from "react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import SpendingCharts from "@/components/SpendingCharts";
import RecategorizeButton from "@/components/RecategorizeButton";
import MoMChart from "@/components/MoMChart";
import SubscriptionsPanel from "@/components/subscriptions/SubscriptionsPanel";
import { getInternalTransferIndices } from "@/lib/transferDetection";
import { canonicalMerchant } from "@/lib/merchantNormalize";
import { detectSubscriptions } from "@/lib/subscriptions/subscription-detector";
import type { TransactionInput } from "@/lib/subscriptions/subscription-detector";

type TxRow = {
  date: string;
  amount: number;
  category: string | null;
  merchant_clean: string | null;
  is_recurring: boolean | null;
  transaction_type: string | null;
  account_type: string | null;
  expense_context?: string | null;
};

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  const [txResult, subsResult] = await Promise.all([
    supabase
      .from("transactions")
      // TODO(P1-C): Add merchant_canonical, merchant_category_normalized to this select
      // once the columns are backfilled, and use them in place of in-memory normalization.
      .select("date, amount, category, merchant_clean, is_recurring, transaction_type, account_type, expense_context"),
    userId
      ? supabase
          .from("subscriptions")
          .select("merchant_canonical, status, is_actual_subscription")
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
  ]);

  const rows = (txResult.data ?? []) as TxRow[];
  const savedStatuses = new Map<string, { status: string; isActual: boolean }>();
  for (const sub of subsResult.data ?? []) {
    savedStatuses.set(sub.merchant_canonical, {
      status: sub.status,
      isActual: sub.is_actual_subscription,
    });
  }

  const internalTransferIndices = getInternalTransferIndices(rows);
  const isSpendRow = (i: number) =>
    rows[i].amount < 0 && !internalTransferIndices.has(i);
  const isReceivedRow = (i: number) =>
    rows[i].amount > 0 && !internalTransferIndices.has(i);

  // spendByCategory: top 8 categories by total absolute spend (exclude internal transfers)
  const categoryMap = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    if (isSpendRow(i)) {
      const row = rows[i];
      const key = row.category ?? "Uncategorized";
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + Math.abs(row.amount));
    }
  }
  const spendByCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // monthlyFlow: per YYYY-MM month, compute spent and received (exclude internal transfers)
  const monthMap = new Map<string, { spent: number; received: number }>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const month = row.date.slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { spent: 0, received: 0 });
    const entry = monthMap.get(month)!;
    if (isSpendRow(i)) entry.spent += Math.abs(row.amount);
    else if (isReceivedRow(i)) entry.received += row.amount;
  }
  const monthlyFlow = Array.from(monthMap.entries())
    .map(([month, { spent, received }]) => ({
      month,
      spent: Math.round(spent * 100) / 100,
      received: Math.round(received * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // topMerchants: top 10 merchants by total absolute spend (exclude internal transfers; canonical names)
  // TODO(P1-C): Once merchant_canonical is backfilled, query merchant_canonical
  // directly instead of applying canonicalMerchant() in-memory on merchant_clean.
  const merchantMap = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    if (isSpendRow(i) && rows[i].merchant_clean != null) {
      const m =
        (canonicalMerchant(rows[i].merchant_clean) ?? rows[i].merchant_clean) || "Unknown";
      merchantMap.set(m, (merchantMap.get(m) ?? 0) + Math.abs(rows[i].amount));
    }
  }
  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, total]) => ({ merchant, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const uncategorizedCount = rows.filter(
    (r, i) => isSpendRow(i) && r.category === null
  ).length;

  // -------------------------------------------------------------------------
  // MoM category breakdown (exclude internal transfers from spend)
  // -------------------------------------------------------------------------
  const momData: Record<string, Record<string, number>> = {};
  for (let i = 0; i < rows.length; i++) {
    if (isSpendRow(i)) {
      const row = rows[i];
      const month = row.date.slice(0, 7);
      const cat = row.category ?? "Uncategorized";
      if (!momData[month]) momData[month] = {};
      momData[month][cat] = (momData[month][cat] ?? 0) + Math.abs(row.amount);
    }
  }
  const momMonths = Object.keys(momData).sort().slice(-6);
  const catTotals: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    if (isSpendRow(i)) {
      const cat = rows[i].category ?? "Uncategorized";
      catTotals[cat] = (catTotals[cat] ?? 0) + Math.abs(rows[i].amount);
    }
  }
  const top5Cats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);
  const momChartData = momMonths.map((month) => {
    const obj: Record<string, number | string> = { month };
    for (const cat of top5Cats) {
      obj[cat] = Math.round((momData[month]?.[cat] ?? 0) * 100) / 100;
    }
    return obj;
  });

  // -------------------------------------------------------------------------
  // Subscriptions — confidence-based detection (replaces old >=2 months logic)
  // -------------------------------------------------------------------------
  const spendTransactions: TransactionInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (isSpendRow(i)) {
      spendTransactions.push({
        date: rows[i].date,
        amount: rows[i].amount,
        merchant_clean: rows[i].merchant_clean,
        category: rows[i].category,
        is_recurring: rows[i].is_recurring,
        expense_context: rows[i].expense_context,
      });
    }
  }
  const detectedSubs = detectSubscriptions(spendTransactions);

  // Merge saved user confirmations/dismissals with detected subscriptions
  const subscriptionList = detectedSubs
    .map((sub) => {
      const saved = savedStatuses.get(sub.merchant);
      if (saved) {
        // If user dismissed, keep it dismissed; if confirmed, keep confirmed
        return { ...sub, status: saved.status as typeof sub.status };
      }
      return sub;
    })
    .filter((sub) => sub.status !== "dismissed");

  const totalPersonalMonthly = Math.round(
    subscriptionList
      .filter((s) => !s.expenseContext.startsWith("business_"))
      .reduce((sum, s) => sum + s.monthlyAmount, 0) * 100
  ) / 100;
  const totalBusinessMonthly = Math.round(
    subscriptionList
      .filter((s) => s.expenseContext.startsWith("business_"))
      .reduce((sum, s) => sum + s.monthlyAmount, 0) * 100
  ) / 100;

  // -------------------------------------------------------------------------
  // Refunds & credits
  // -------------------------------------------------------------------------
  const refunds = rows
    .filter((r) => r.transaction_type === "refund" && r.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => ({
      date: r.date,
      merchant: canonicalMerchant(r.merchant_clean) ?? r.merchant_clean ?? "Unknown",
      amount: r.amount,
    }));
  const totalRefunds = Math.round(refunds.reduce((s, r) => s + r.amount, 0) * 100) / 100;

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-1 pt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Analytics</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Spending breakdown across your statements</p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-8 py-16 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">No data yet</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Upload a statement on the{" "}
              <a href="/dashboard" className="text-[var(--primary)] underline hover:opacity-80">
                Overview
              </a>{" "}
              tab to get started.
            </p>
          </div>
        ) : (
          <>
            {uncategorizedCount > 0 && (
              <RecategorizeButton uncategorizedCount={uncategorizedCount} />
            )}
            <SpendingCharts
              spendByCategory={spendByCategory}
              monthlyFlow={monthlyFlow}
              topMerchants={topMerchants}
            />

            {/* Month-on-Month Category Breakdown */}
            {momChartData.length > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">
                  Month-on-Month by Category
                </h2>
                <MoMChart momChartData={momChartData} top5Cats={top5Cats} />
              </div>
            )}

            {/* Subscriptions & Recurring */}
            <SubscriptionsPanel
              subscriptions={subscriptionList.map((s) => ({
                merchant: s.merchant,
                category: s.category,
                confidenceScore: s.confidenceScore,
                monthlyAmount: s.monthlyAmount,
                annualEstimate: s.annualEstimate,
                occurrenceCount: s.occurrenceCount,
                expenseContext: s.expenseContext,
                status: s.status,
              }))}
              totalPersonalMonthly={totalPersonalMonthly}
              totalBusinessMonthly={totalBusinessMonthly}
            />

            {/* Refunds & Credits */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Refunds & Credits
                </h2>
                {refunds.length > 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    +${totalRefunds.toFixed(2)}
                  </span>
                )}
              </div>

              {refunds.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No refunds detected in your statements.
                </p>
              ) : (
                <div className="space-y-2">
                  {refunds.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 px-4 py-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-[var(--foreground)]">{r.merchant}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{r.date}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400">
                        +${r.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
