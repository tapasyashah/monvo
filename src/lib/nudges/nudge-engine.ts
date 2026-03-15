/**
 * Proactive AI nudge engine.
 *
 * Runs a set of financial health rules against the user's transaction data
 * and inserts nudges into the `nudges` table when conditions are met.
 * Deduplicates: no same nudge_type within 7 days.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "info" | "warning" | "alert";

interface NudgeResult {
  nudge_type: string;
  title: string;
  body: string;
  severity: Severity;
  data: Record<string, unknown>;
}

type NudgeRule = (
  userId: string,
  supabase: SupabaseClient
) => Promise<NudgeResult | null>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthRange(offset: number): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

const EXCLUDED_CATEGORIES = new Set([
  "transfer",
  "transfers",
  "credit card payment",
  "cc payment",
  "investment",
  "investments",
]);

function isRealSpending(tx: { amount: number; category: string | null; transaction_type: string | null }): boolean {
  const isDebit = tx.transaction_type === "debit" || tx.amount < 0;
  const isTransfer = EXCLUDED_CATEGORIES.has((tx.category ?? "").toLowerCase());
  return isDebit && !isTransfer;
}

function isIncome(tx: { amount: number; category: string | null; transaction_type: string | null }): boolean {
  const isCredit = tx.transaction_type === "credit" || tx.amount > 0;
  const isTransfer = EXCLUDED_CATEGORIES.has((tx.category ?? "").toLowerCase());
  return isCredit && !isTransfer;
}

// ---------------------------------------------------------------------------
// Rule: overspend_pace
// ---------------------------------------------------------------------------

const overspendPace: NudgeRule = async (_userId, supabase) => {
  const cur = monthRange(0);
  const prev = monthRange(-1);

  const [curRes, prevRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category, transaction_type, date")
      .gte("date", cur.start)
      .lt("date", cur.end),
    supabase
      .from("transactions")
      .select("amount, category, transaction_type")
      .gte("date", prev.start)
      .lt("date", prev.end),
  ]);

  const curTx = curRes.data ?? [];
  const prevTx = prevRes.data ?? [];
  if (curTx.length === 0 || prevTx.length === 0) return null;

  const prevSpend = prevTx
    .filter(isRealSpending)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  if (prevSpend === 0) return null;

  const curSpend = curTx
    .filter(isRealSpending)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  // Project: (curSpend / daysSoFar) * daysInMonth
  const now = new Date();
  const daysSoFar = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = (curSpend / daysSoFar) * daysInMonth;

  if (projected > prevSpend * 1.2) {
    return {
      nudge_type: "overspend_pace",
      title: "Spending pace is high",
      body: `At your current rate you're projected to spend ${fmt(projected)} this month — ${Math.round(((projected / prevSpend) - 1) * 100)}% more than last month's ${fmt(prevSpend)}.`,
      severity: "warning",
      data: { projected, prevSpend, daysSoFar, daysInMonth },
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Rule: subscription_price_increase
// ---------------------------------------------------------------------------

const subscriptionPriceIncrease: NudgeRule = async (_userId, supabase) => {
  const cur = monthRange(0);
  const prev = monthRange(-1);

  const [curRes, prevRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, merchant_clean, is_recurring")
      .gte("date", cur.start)
      .lt("date", cur.end)
      .eq("is_recurring", true),
    supabase
      .from("transactions")
      .select("amount, merchant_clean, is_recurring")
      .gte("date", prev.start)
      .lt("date", prev.end)
      .eq("is_recurring", true),
  ]);

  const curTx = curRes.data ?? [];
  const prevTx = prevRes.data ?? [];

  // Build merchant → amount maps (take the first charge per merchant per month)
  const prevMap = new Map<string, number>();
  for (const tx of prevTx) {
    if (!tx.merchant_clean || tx.amount >= 0) continue;
    const key = tx.merchant_clean.toLowerCase();
    if (!prevMap.has(key)) prevMap.set(key, Math.abs(tx.amount));
  }

  for (const tx of curTx) {
    if (!tx.merchant_clean || tx.amount >= 0) continue;
    const key = tx.merchant_clean.toLowerCase();
    const prevAmount = prevMap.get(key);
    if (prevAmount && prevAmount > 0) {
      const curAmount = Math.abs(tx.amount);
      const increase = (curAmount - prevAmount) / prevAmount;
      if (increase > 0.05) {
        return {
          nudge_type: "subscription_price_increase",
          title: "Subscription price went up",
          body: `${tx.merchant_clean} charged ${fmt(curAmount)} — up from ${fmt(prevAmount)} last month (+${Math.round(increase * 100)}%).`,
          severity: "info",
          data: { merchant: tx.merchant_clean, curAmount, prevAmount, increase },
        };
      }
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Rule: large_unusual_charge
// ---------------------------------------------------------------------------

const largeUnusualCharge: NudgeRule = async (_userId, supabase) => {
  // Look at last 6 months of transactions to build averages
  const sixMonthsAgo = monthRange(-6).start;
  const cur = monthRange(0);

  const { data: allTx } = await supabase
    .from("transactions")
    .select("amount, merchant_clean, date")
    .gte("date", sixMonthsAgo)
    .lt("date", cur.end)
    .lt("amount", 0);

  if (!allTx || allTx.length === 0) return null;

  // Build merchant → list of amounts
  const merchantAmounts = new Map<string, number[]>();
  for (const tx of allTx) {
    if (!tx.merchant_clean) continue;
    const key = tx.merchant_clean.toLowerCase();
    if (!merchantAmounts.has(key)) merchantAmounts.set(key, []);
    merchantAmounts.get(key)!.push(Math.abs(tx.amount));
  }

  // Check current month transactions against averages
  for (const tx of allTx) {
    if (!tx.merchant_clean) continue;
    if (tx.date < cur.start) continue; // only current month

    const key = tx.merchant_clean.toLowerCase();
    const amounts = merchantAmounts.get(key);
    if (!amounts || amounts.length < 2) continue;

    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const charge = Math.abs(tx.amount);

    if (charge > avg * 3) {
      return {
        nudge_type: "large_unusual_charge",
        title: "Unusually large charge detected",
        body: `A ${fmt(charge)} charge at ${tx.merchant_clean} is ${Math.round(charge / avg)}x your usual average of ${fmt(avg)}.`,
        severity: "alert",
        data: { merchant: tx.merchant_clean, charge, average: avg },
      };
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Rule: low_surplus
// ---------------------------------------------------------------------------

const lowSurplus: NudgeRule = async (_userId, supabase) => {
  const cur = monthRange(0);

  const { data: curTx } = await supabase
    .from("transactions")
    .select("amount, category, transaction_type")
    .gte("date", cur.start)
    .lt("date", cur.end);

  if (!curTx || curTx.length === 0) return null;

  const income = curTx
    .filter(isIncome)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  if (income === 0) return null;

  const spending = curTx
    .filter(isRealSpending)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const surplus = income - spending;
  const surplusRate = surplus / income;

  if (surplusRate < 0.1) {
    return {
      nudge_type: "low_surplus",
      title: "Surplus is running thin",
      body: `Your surplus this month is ${fmt(surplus)} — only ${Math.round(surplusRate * 100)}% of your ${fmt(income)} income. Consider trimming non-essentials.`,
      severity: surplus < 0 ? "alert" : "warning",
      data: { surplus, income, spending, surplusRate },
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Rule: business_spend_high
// ---------------------------------------------------------------------------

const businessSpendHigh: NudgeRule = async (_userId, supabase) => {
  const cur = monthRange(0);

  const { data: curTx } = await supabase
    .from("transactions")
    .select("amount, category, transaction_type, expense_context")
    .gte("date", cur.start)
    .lt("date", cur.end);

  if (!curTx || curTx.length === 0) return null;

  const totalSpend = curTx
    .filter(isRealSpending)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  if (totalSpend === 0) return null;

  const businessSpend = curTx
    .filter(
      (t) =>
        isRealSpending(t) &&
        typeof t.expense_context === "string" &&
        t.expense_context.startsWith("business")
    )
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const ratio = businessSpend / totalSpend;

  if (ratio > 0.3) {
    return {
      nudge_type: "business_spend_high",
      title: "Business expenses are elevated",
      body: `Business spending is ${fmt(businessSpend)} this month — ${Math.round(ratio * 100)}% of your total. Make sure you're tracking these for tax purposes.`,
      severity: "info",
      data: { businessSpend, totalSpend, ratio },
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// All rules
// ---------------------------------------------------------------------------

const ALL_RULES: NudgeRule[] = [
  overspendPace,
  subscriptionPriceIncrease,
  largeUnusualCharge,
  lowSurplus,
  businessSpendHigh,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all nudge rules for a user. Deduplicates against existing nudges
 * (no same nudge_type within 7 days). Inserts new nudges and returns them.
 */
export async function runNudgeEngine(
  userId: string,
  supabase: SupabaseClient
): Promise<NudgeResult[]> {
  // 1. Run all rules in parallel
  const results = await Promise.all(
    ALL_RULES.map((rule) =>
      rule(userId, supabase).catch(() => null)
    )
  );

  const candidates = results.filter(
    (r): r is NudgeResult => r !== null
  );

  if (candidates.length === 0) return [];

  // 2. Check recent nudges to deduplicate (within 7 days)
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: recentNudges } = await supabase
    .from("nudges")
    .select("nudge_type")
    .eq("user_id", userId)
    .gte("created_at", sevenDaysAgo);

  const recentTypes = new Set(
    (recentNudges ?? []).map((n: { nudge_type: string }) => n.nudge_type)
  );

  const newNudges = candidates.filter(
    (c) => !recentTypes.has(c.nudge_type)
  );

  if (newNudges.length === 0) return [];

  // 3. Insert new nudges
  const rows = newNudges.map((n) => ({
    user_id: userId,
    nudge_type: n.nudge_type,
    title: n.title,
    body: n.body,
    severity: n.severity,
    data: n.data,
    expires_at: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));

  await supabase.from("nudges").insert(rows);

  return newNudges;
}
