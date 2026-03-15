/**
 * Builds user financial context from Supabase data for the Ask Monvo
 * context-aware assistant. Fetches current-month income/spending,
 * top categories, active subscriptions, and recent nudges.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface UserFinancialContext {
  currentMonthIncome: number;
  currentMonthSpending: number;
  surplus: number;
  topCategories: { category: string; total: number }[];
  activeSubscriptions: { merchant: string; monthlyAmount: number }[];
  recentNudges: string[];
  asOfDate: string;
}

export async function buildUserContext(
  supabase: SupabaseClient
): Promise<UserFinancialContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return emptyContext();
  }

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  // Fetch current month transactions, subscriptions, and nudges in parallel
  const [txResult, subsResult, nudgesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category, merchant_clean")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lt("date", monthEnd),
    supabase
      .from("subscriptions")
      .select("merchant_canonical, status, is_actual_subscription")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .eq("is_actual_subscription", true),
    supabase
      .from("recommendations")
      .select("title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const transactions = txResult.data ?? [];
  const subscriptionRows = subsResult.data ?? [];
  const nudgeRows = nudgesResult.data ?? [];

  // Calculate income and spending
  let income = 0;
  let spending = 0;
  const categoryTotals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.amount > 0) {
      income += tx.amount;
    } else {
      const amt = Math.abs(tx.amount);
      spending += amt;
      const cat = tx.category ?? "Uncategorized";
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + amt);
    }
  }

  // Top 5 categories by total spend
  const topCategories = Array.from(categoryTotals.entries())
    .map(([category, total]) => ({
      category,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Map confirmed subscriptions to monthly amounts from transaction data
  // We use the subscription detector's data via the recurring transactions
  const subscriptionMerchants = new Set(
    subscriptionRows.map((s) => s.merchant_canonical as string)
  );

  // Get subscription amounts from recurring transactions (last 3 months)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const threeMonthStart = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: recentRecurring } = await supabase
    .from("transactions")
    .select("merchant_clean, amount")
    .eq("user_id", user.id)
    .eq("is_recurring", true)
    .lt("amount", 0)
    .gte("date", threeMonthStart);

  const subAmounts = new Map<string, { total: number; count: number }>();
  for (const tx of recentRecurring ?? []) {
    const merchant = tx.merchant_clean ?? "Unknown";
    if (!subscriptionMerchants.has(merchant) && subscriptionMerchants.size > 0) {
      // If we have confirmed subs, only include those
      continue;
    }
    const entry = subAmounts.get(merchant) ?? { total: 0, count: 0 };
    entry.total += Math.abs(tx.amount);
    entry.count += 1;
    subAmounts.set(merchant, entry);
  }

  const activeSubscriptions = Array.from(subAmounts.entries())
    .map(([merchant, { total, count }]) => ({
      merchant,
      monthlyAmount: Math.round((total / Math.max(count, 1)) * 100) / 100,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const recentNudges = nudgeRows.map((n) => n.title as string);

  return {
    currentMonthIncome: Math.round(income * 100) / 100,
    currentMonthSpending: Math.round(spending * 100) / 100,
    surplus: Math.round((income - spending) * 100) / 100,
    topCategories,
    activeSubscriptions,
    recentNudges,
    asOfDate: now.toISOString().slice(0, 10),
  };
}

function emptyContext(): UserFinancialContext {
  return {
    currentMonthIncome: 0,
    currentMonthSpending: 0,
    surplus: 0,
    topCategories: [],
    activeSubscriptions: [],
    recentNudges: [],
    asOfDate: new Date().toISOString().slice(0, 10),
  };
}

export function formatContextForPrompt(ctx: UserFinancialContext): string {
  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-CA")}`;
  const surplusSign = ctx.surplus >= 0 ? "+" : "-";

  const categoryLines =
    ctx.topCategories.length > 0
      ? ctx.topCategories.map((c) => `${c.category} (${fmt(c.total)})`).join(", ")
      : "not enough data yet";

  const subLines =
    ctx.activeSubscriptions.length > 0
      ? ctx.activeSubscriptions
          .map((s) => `${s.merchant} ${fmt(s.monthlyAmount)}/mo`)
          .join(", ")
      : "none detected";

  const nudgeLines =
    ctx.recentNudges.length > 0
      ? ctx.recentNudges.map((n) => `- ${n}`).join("\n")
      : "none";

  return `## User's financial context (current as of ${ctx.asOfDate})
This month so far:
- Income: ${fmt(ctx.currentMonthIncome)}
- True personal spending: ${fmt(ctx.currentMonthSpending)}
- Surplus/deficit: ${surplusSign}${fmt(ctx.surplus)}

Top spending categories: ${categoryLines}

Active subscriptions: ${subLines}

Recent nudges/recommendations:
${nudgeLines}`;
}
