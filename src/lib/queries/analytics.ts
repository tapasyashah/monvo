/**
 * Pure transformation functions for analytics data.
 *
 * These operate on already-fetched transaction rows — no database access.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TxRow = {
  date: string;
  amount: number;
  category: string | null;
  merchant_clean: string | null;
  is_recurring: boolean | null;
  transaction_type: string | null;
  account_type: string | null;
  expense_context?: string | null;
};

export interface WaterfallBar {
  name: string;
  value: number;
  runningTotal: number;
  type: "income" | "expense" | "surplus" | "deficit";
  categoryKey: string;
}

export interface DrillDownTransaction {
  merchant: string;
  date: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// getWaterfallData
// ---------------------------------------------------------------------------

/**
 * Build waterfall bars from transaction rows for a single month.
 *
 * Shape: Income (positive) → expense categories (each going down) → surplus/deficit.
 * The bars sum correctly: income = sum(expenses) + surplus (or - deficit).
 *
 * @param transactions All transaction rows (will be filtered to the given month)
 * @param month        YYYY-MM string to filter on; if omitted, uses all rows
 * @param internalTransferIndices Set of row indices that are internal transfers (excluded)
 */
export function getWaterfallData(
  transactions: TxRow[],
  month?: string,
  internalTransferIndices?: Set<number>,
): WaterfallBar[] {
  const excluded = internalTransferIndices ?? new Set<number>();

  let totalIncome = 0;
  const categoryTotals = new Map<string, number>();

  for (let i = 0; i < transactions.length; i++) {
    if (excluded.has(i)) continue;
    const row = transactions[i];
    if (month && !row.date.startsWith(month)) continue;

    if (row.amount > 0) {
      totalIncome += row.amount;
    } else {
      const cat = row.category ?? "Uncategorized";
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + Math.abs(row.amount));
    }
  }

  totalIncome = round2(totalIncome);

  // Sort expense categories by total descending
  const sortedCategories = Array.from(categoryTotals.entries())
    .map(([cat, total]) => ({ cat, total: round2(total) }))
    .sort((a, b) => b.total - a.total);

  const totalExpenses = round2(sortedCategories.reduce((s, c) => s + c.total, 0));
  const surplus = round2(totalIncome - totalExpenses);

  const bars: WaterfallBar[] = [];

  // 1. Income bar — starts at 0, goes up to totalIncome
  bars.push({
    name: "Income",
    value: totalIncome,
    runningTotal: totalIncome,
    type: "income",
    categoryKey: "__income__",
  });

  // 2. Expense bars — each drains from the running total
  let running = totalIncome;
  for (const { cat, total } of sortedCategories) {
    running = round2(running - total);
    bars.push({
      name: cat,
      value: total,
      runningTotal: running,
      type: "expense",
      categoryKey: cat,
    });
  }

  // 3. Surplus / deficit bar
  bars.push({
    name: surplus >= 0 ? "Surplus" : "Deficit",
    value: Math.abs(surplus),
    runningTotal: surplus >= 0 ? surplus : surplus,
    type: surplus >= 0 ? "surplus" : "deficit",
    categoryKey: surplus >= 0 ? "__surplus__" : "__deficit__",
  });

  return bars;
}

// ---------------------------------------------------------------------------
// getCategoryTransactions
// ---------------------------------------------------------------------------

/**
 * Return individual transactions for a given category in a given month,
 * sorted by absolute amount descending.
 */
export function getCategoryTransactions(
  transactions: TxRow[],
  category: string,
  month?: string,
  internalTransferIndices?: Set<number>,
): DrillDownTransaction[] {
  const excluded = internalTransferIndices ?? new Set<number>();

  const results: DrillDownTransaction[] = [];

  for (let i = 0; i < transactions.length; i++) {
    if (excluded.has(i)) continue;
    const row = transactions[i];
    if (month && !row.date.startsWith(month)) continue;

    if (category === "__income__") {
      if (row.amount > 0) {
        results.push({
          merchant: row.merchant_clean ?? "Unknown",
          date: row.date,
          amount: row.amount,
        });
      }
    } else {
      const rowCat = row.category ?? "Uncategorized";
      if (row.amount < 0 && rowCat === category) {
        results.push({
          merchant: row.merchant_clean ?? "Unknown",
          date: row.date,
          amount: Math.abs(row.amount),
        });
      }
    }
  }

  return results.sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// getAvailableMonths
// ---------------------------------------------------------------------------

/** Extract sorted unique YYYY-MM months from transactions. */
export function getAvailableMonths(transactions: TxRow[]): string[] {
  const months = new Set<string>();
  for (const row of transactions) {
    months.add(row.date.slice(0, 7));
  }
  return Array.from(months).sort();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
