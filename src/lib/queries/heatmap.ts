/**
 * Pure computation for the spend heatmap calendar.
 * Operates on already-fetched transaction rows — no DB calls.
 */

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

export interface DailySpendData {
  date: string; // YYYY-MM-DD
  total_spent: number;
  transaction_count: number;
  top_merchant: string;
  has_income: boolean;
}

export interface HeatmapResult {
  days: DailySpendData[];
  averageDailySpend: number;
}

/**
 * Compute per-day spend aggregates for a given month.
 * @param transactions All transaction rows (already filtered for the user).
 * @param year Full year, e.g. 2026
 * @param month 0-indexed month (0 = January)
 */
export function computeDailySpendData(
  transactions: TxRow[],
  year: number,
  month: number,
): HeatmapResult {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a YYYY-MM-DD → aggregates map
  const dayMap = new Map<
    string,
    { spent: number; count: number; merchants: Map<string, number>; hasIncome: boolean }
  >();

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dayMap.set(key, { spent: 0, count: 0, merchants: new Map(), hasIncome: false });
  }

  for (const tx of transactions) {
    const entry = dayMap.get(tx.date);
    if (!entry) continue;

    if (tx.amount < 0) {
      // Spend (negative amounts)
      const abs = Math.abs(tx.amount);
      entry.spent += abs;
      entry.count += 1;
      const merchant = tx.merchant_clean ?? "Unknown";
      entry.merchants.set(merchant, (entry.merchants.get(merchant) ?? 0) + abs);
    } else if (tx.amount > 0) {
      entry.hasIncome = true;
    }
  }

  const days: DailySpendData[] = [];
  let totalSpent = 0;
  let daysWithSpend = 0;

  for (const [date, agg] of dayMap) {
    let topMerchant = "—";
    let topAmount = 0;
    for (const [m, amt] of agg.merchants) {
      if (amt > topAmount) {
        topMerchant = m;
        topAmount = amt;
      }
    }

    days.push({
      date,
      total_spent: Math.round(agg.spent * 100) / 100,
      transaction_count: agg.count,
      top_merchant: topMerchant,
      has_income: agg.hasIncome,
    });

    if (agg.spent > 0) {
      totalSpent += agg.spent;
      daysWithSpend += 1;
    }
  }

  // Average over ALL days in the month (not just spend days) for more meaningful heat
  const averageDailySpend =
    daysInMonth > 0 ? Math.round((totalSpent / daysInMonth) * 100) / 100 : 0;

  return { days, averageDailySpend };
}

/**
 * Return top N highest-spend days, sorted descending.
 */
export function getNotableDays(
  days: DailySpendData[],
  averageDailySpend: number,
  topN = 5,
): Array<DailySpendData & { multipleOfAvg: number }> {
  return days
    .filter((d) => d.total_spent > 0)
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, topN)
    .map((d) => ({
      ...d,
      multipleOfAvg:
        averageDailySpend > 0
          ? Math.round((d.total_spent / averageDailySpend) * 100) / 100
          : 0,
    }));
}
