import React from "react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import SpendingCharts from "@/components/SpendingCharts";
import RecategorizeButton from "@/components/RecategorizeButton";
import MoMChart from "@/components/MoMChart";

type TxRow = {
  date: string;
  amount: number;
  category: string | null;
  merchant_clean: string | null;
  is_recurring: boolean | null;
  transaction_type: string | null;
};

function classifyRecurring(merchant: string, category: string | null): string {
  const m = merchant.toLowerCase();
  if (/netflix|spotify|crave|disney|apple tv|prime video|youtube/.test(m)) return "Streaming";
  if (/rogers|bell|telus|fido|koodo|virgin|public mobile/.test(m)) return "Phone/Internet";
  if (/gym|goodlife|anytime fitness|ymca|equinox/.test(m)) return "Gym";
  if (/insurance|intact|aviva|td insurance|rbc insurance/.test(m)) return "Insurance";
  if (category) return category;
  return "Other";
}

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("transactions")
    .select("date, amount, category, merchant_clean, is_recurring, transaction_type");

  const rows = (data ?? []) as TxRow[];

  // spendByCategory: top 8 categories by total absolute spend (amount < 0)
  const categoryMap = new Map<string, number>();
  for (const row of rows) {
    if (row.amount < 0) {
      const key = row.category ?? "Uncategorized";
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + Math.abs(row.amount));
    }
  }
  const spendByCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // monthlyFlow: per YYYY-MM month, compute spent and received
  const monthMap = new Map<string, { spent: number; received: number }>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { spent: 0, received: 0 });
    const entry = monthMap.get(month)!;
    if (row.amount < 0) entry.spent += Math.abs(row.amount);
    else entry.received += row.amount;
  }
  const monthlyFlow = Array.from(monthMap.entries())
    .map(([month, { spent, received }]) => ({
      month,
      spent: Math.round(spent * 100) / 100,
      received: Math.round(received * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // topMerchants: top 10 merchants by total absolute spend (amount < 0)
  const merchantMap = new Map<string, number>();
  for (const row of rows) {
    if (row.amount < 0 && row.merchant_clean != null) {
      merchantMap.set(
        row.merchant_clean,
        (merchantMap.get(row.merchant_clean) ?? 0) + Math.abs(row.amount)
      );
    }
  }
  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, total]) => ({ merchant, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const uncategorizedCount = rows.filter(
    (r) => r.amount < 0 && r.category === null
  ).length;

  // -------------------------------------------------------------------------
  // MoM category breakdown
  // -------------------------------------------------------------------------
  const momData: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (row.amount < 0) {
      const month = row.date.slice(0, 7);
      const cat = row.category ?? "Uncategorized";
      if (!momData[month]) momData[month] = {};
      momData[month][cat] = (momData[month][cat] ?? 0) + Math.abs(row.amount);
    }
  }
  const momMonths = Object.keys(momData).sort().slice(-6);
  const catTotals: Record<string, number> = {};
  for (const row of rows) {
    if (row.amount < 0) {
      const cat = row.category ?? "Uncategorized";
      catTotals[cat] = (catTotals[cat] ?? 0) + Math.abs(row.amount);
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
  // Recurring & subscriptions
  // -------------------------------------------------------------------------
  const recurringMerchantMap: Record<
    string,
    { total: number; months: Set<string>; category: string | null }
  > = {};
  for (const row of rows) {
    if (row.is_recurring && row.amount < 0 && row.merchant_clean) {
      const key = row.merchant_clean;
      if (!recurringMerchantMap[key]) {
        recurringMerchantMap[key] = { total: 0, months: new Set(), category: row.category };
      }
      recurringMerchantMap[key].total += Math.abs(row.amount);
      recurringMerchantMap[key].months.add(row.date.slice(0, 7));
    }
  }
  const recurringList = Object.entries(recurringMerchantMap)
    .map(([merchant, d]) => ({
      merchant,
      subCategory: classifyRecurring(merchant, d.category),
      monthlyAvg: Math.round((d.total / Math.max(d.months.size, 1)) * 100) / 100,
      annualEst: Math.round((d.total / Math.max(d.months.size, 1)) * 12 * 100) / 100,
    }))
    .sort((a, b) => b.monthlyAvg - a.monthlyAvg);
  const totalMonthlyRecurring = Math.round(
    recurringList.reduce((s, r) => s + r.monthlyAvg, 0) * 100
  ) / 100;

  // -------------------------------------------------------------------------
  // Refunds & credits
  // -------------------------------------------------------------------------
  const refunds = rows
    .filter((r) => r.transaction_type === "refund" && r.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => ({
      date: r.date,
      merchant: r.merchant_clean ?? "Unknown",
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

            {/* Recurring & Subscriptions */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Recurring & Subscriptions
                </h2>
                {recurringList.length > 0 && (
                  <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                    ${totalMonthlyRecurring.toFixed(2)}/mo
                  </span>
                )}
              </div>

              {recurringList.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No recurring transactions detected yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                        <th className="pb-2 pr-4 font-medium">Merchant</th>
                        <th className="pb-2 pr-4 font-medium">Category</th>
                        <th className="pb-2 pr-4 text-right font-medium">Monthly</th>
                        <th className="pb-2 text-right font-medium">Annual Est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recurringList.map((r, i) => (
                        <tr
                          key={i}
                          className="border-b border-[var(--border)]/50 last:border-0"
                        >
                          <td className="py-2.5 pr-4 font-medium text-[var(--foreground)]">
                            {r.merchant}
                          </td>
                          <td className="py-2.5 pr-4 text-[var(--muted-foreground)]">
                            {r.subCategory}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-[var(--foreground)]">
                            ${r.monthlyAvg.toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right text-[var(--muted-foreground)]">
                            ${r.annualEst.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

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
