import React from "react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import SpendingCharts from "@/components/SpendingCharts";
import RecategorizeButton from "@/components/RecategorizeButton";

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("transactions")
    .select("date, amount, category, merchant_clean");
  const rows = (data ?? []) as {
    date: string;
    amount: number;
    category: string | null;
    merchant_clean: string | null;
  }[];

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
    const month = row.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      monthMap.set(month, { spent: 0, received: 0 });
    }
    const entry = monthMap.get(month)!;
    if (row.amount < 0) {
      entry.spent += Math.abs(row.amount);
    } else {
      entry.received += row.amount;
    }
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

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">Analytics</h1>
          <p className="text-sm text-neutral-400">Spending breakdown across your statements</p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-8 py-16 text-center">
            <p className="text-sm font-medium text-neutral-300">No data yet</p>
            <p className="mt-1 text-sm text-neutral-500">
              Upload a statement on the{" "}
              <a href="/dashboard" className="underline hover:text-neutral-300">
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
          </>
        )}
      </div>
    </div>
  );
}
