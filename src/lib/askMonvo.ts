// src/lib/askMonvo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export interface FinancialSnapshot {
  monthlyNetIncome: number;
  monthlyFixedCosts: number;
  discretionaryBreakdown: { category: string; monthlyAvg: number }[];
  subscriptions: { merchant: string; monthlyAmount: number }[];
  monthlySurplus: number;
  savingsRate: number;
  liquidBalanceProxy: number;
  outstandingDebt: number;
  emergencyFundMonths: number;
  dataQuality: "good" | "limited";
  monthsOfHistory: number;
}

export async function assembleFinancialSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancialSnapshot> {
  const { data: transactions } = await supabase
    .from("transactions")
    .select("date, merchant_clean, category, amount, account_type, is_recurring")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  const txs = transactions ?? [];

  // Build monthly buckets
  const monthMap = new Map<string, { totalIn: number; totalOut: number }>();
  for (const t of txs) {
    const month = (t.date as string).slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { totalIn: 0, totalOut: 0 });
    const entry = monthMap.get(month)!;
    if (t.amount > 0) entry.totalIn += t.amount;
    else entry.totalOut += Math.abs(t.amount);
  }

  const allMonths = Array.from(monthMap.keys()).sort();
  const last3 = allMonths.slice(-3);
  const monthsOfHistory = allMonths.length;
  const dataQuality: "good" | "limited" = monthsOfHistory >= 2 ? "good" : "limited";

  const relevantMonths = last3.length > 0 ? last3 : allMonths;

  const avgIn =
    relevantMonths.reduce((s, m) => s + (monthMap.get(m)?.totalIn ?? 0), 0) /
    Math.max(relevantMonths.length, 1);
  const avgOut =
    relevantMonths.reduce((s, m) => s + (monthMap.get(m)?.totalOut ?? 0), 0) /
    Math.max(relevantMonths.length, 1);

  // Fixed/recurring costs
  const recurringMap = new Map<string, { total: number; months: Set<string> }>();
  for (const t of txs) {
    if (t.is_recurring && t.amount < 0) {
      const key = t.merchant_clean ?? "Unknown";
      const month = (t.date as string).slice(0, 7);
      if (!recurringMap.has(key)) recurringMap.set(key, { total: 0, months: new Set() });
      const e = recurringMap.get(key)!;
      e.total += Math.abs(t.amount);
      e.months.add(month);
    }
  }

  const subscriptions: { merchant: string; monthlyAmount: number }[] = [];
  let monthlyFixedCosts = 0;
  for (const [merchant, { total, months }] of recurringMap.entries()) {
    const monthlyAmount = Math.round((total / Math.max(months.size, 1)) * 100) / 100;
    monthlyFixedCosts += monthlyAmount;
    if (monthlyAmount < 100) {
      subscriptions.push({ merchant, monthlyAmount });
    }
  }

  // Discretionary: top 5 non-recurring spend categories
  const categoryMap = new Map<string, { total: number; months: Set<string> }>();
  for (const t of txs) {
    if (t.amount < 0 && !t.is_recurring) {
      const key = t.category ?? "Uncategorized";
      const month = (t.date as string).slice(0, 7);
      if (!categoryMap.has(key)) categoryMap.set(key, { total: 0, months: new Set() });
      const e = categoryMap.get(key)!;
      e.total += Math.abs(t.amount);
      e.months.add(month);
    }
  }
  const discretionaryBreakdown = Array.from(categoryMap.entries())
    .map(([category, { total, months }]) => ({
      category,
      monthlyAvg: Math.round((total / Math.max(months.size, 1)) * 100) / 100,
    }))
    .sort((a, b) => b.monthlyAvg - a.monthlyAvg)
    .slice(0, 5);

  // Liquid balance proxy
  let liquidBalanceProxy = 0;
  for (const t of txs) {
    liquidBalanceProxy += t.amount;
  }
  liquidBalanceProxy = Math.round(liquidBalanceProxy * 100) / 100;

  const monthlySurplus = Math.round((avgIn - avgOut) * 100) / 100;
  const savingsRate = avgIn > 0 ? Math.round((monthlySurplus / avgIn) * 100 * 10) / 10 : 0;
  const emergencyFundMonths =
    avgOut > 0 ? Math.round((liquidBalanceProxy / avgOut) * 10) / 10 : 0;

  return {
    monthlyNetIncome: Math.round(avgIn * 100) / 100,
    monthlyFixedCosts: Math.round(monthlyFixedCosts * 100) / 100,
    discretionaryBreakdown,
    subscriptions,
    monthlySurplus,
    savingsRate,
    liquidBalanceProxy,
    outstandingDebt: 0,
    emergencyFundMonths,
    dataQuality,
    monthsOfHistory,
  };
}
