/**
 * Quick-answer templates for common financial questions.
 * These bypass the LLM for speed by querying the DB directly.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface TemplateMatch {
  matched: true;
  answer: string;
}

export interface TemplateNoMatch {
  matched: false;
}

export type TemplateResult = TemplateMatch | TemplateNoMatch;

interface QuestionTemplate {
  pattern: RegExp;
  handler: (supabase: SupabaseClient, match: RegExpMatchArray) => Promise<string>;
}

async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function fmt(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TEMPLATES: QuestionTemplate[] = [
  // "What did I spend on [category]?"
  {
    pattern: /what\s+did\s+i\s+spend\s+on\s+(.+?)[\s?]*$/i,
    handler: async (supabase, match) => {
      const userId = await getUserId(supabase);
      if (!userId) return "Please sign in to see your spending data.";

      const category = match[1].trim();
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .ilike("category", `%${category}%`)
        .lt("amount", 0)
        .gte("date", monthStart);

      const total = (data ?? []).reduce(
        (sum, tx) => sum + Math.abs(tx.amount),
        0
      );
      const count = data?.length ?? 0;

      if (count === 0) {
        return `No spending found for "${category}" this month.`;
      }

      return `This month you've spent ${fmt(total)} on ${category} across ${count} transaction${count === 1 ? "" : "s"}.`;
    },
  },

  // "How much at [merchant]?"
  {
    pattern: /how\s+much\s+(?:did\s+i\s+spend\s+)?at\s+(.+?)[\s?]*$/i,
    handler: async (supabase, match) => {
      const userId = await getUserId(supabase);
      if (!userId) return "Please sign in to see your spending data.";

      const merchant = match[1].trim();
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .ilike("merchant_clean", `%${merchant}%`)
        .lt("amount", 0)
        .gte("date", monthStart);

      const total = (data ?? []).reduce(
        (sum, tx) => sum + Math.abs(tx.amount),
        0
      );
      const count = data?.length ?? 0;

      if (count === 0) {
        return `No transactions found at "${merchant}" this month.`;
      }

      return `You've spent ${fmt(total)} at ${merchant} this month across ${count} transaction${count === 1 ? "" : "s"}.`;
    },
  },

  // "What are my subscriptions?"
  {
    pattern: /what\s+are\s+my\s+subscriptions|list\s+(?:my\s+)?subscriptions|show\s+(?:my\s+)?subscriptions/i,
    handler: async (supabase) => {
      const userId = await getUserId(supabase);
      if (!userId) return "Please sign in to see your subscriptions.";

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("merchant_canonical, status, is_actual_subscription")
        .eq("user_id", userId)
        .eq("status", "confirmed")
        .eq("is_actual_subscription", true);

      if (!subs || subs.length === 0) {
        return "No confirmed subscriptions found. Upload more bank statements so Monvo can detect recurring charges.";
      }

      // Get amounts from recent recurring transactions
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const threeMonthStart = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

      const merchantNames = subs.map((s) => s.merchant_canonical as string);

      const { data: txs } = await supabase
        .from("transactions")
        .select("merchant_clean, amount")
        .eq("user_id", userId)
        .eq("is_recurring", true)
        .lt("amount", 0)
        .gte("date", threeMonthStart);

      const merchantSet = new Set(merchantNames);
      const amountMap = new Map<string, { total: number; count: number }>();
      for (const tx of txs ?? []) {
        const m = tx.merchant_clean ?? "";
        if (!merchantSet.has(m)) continue;
        const entry = amountMap.get(m) ?? { total: 0, count: 0 };
        entry.total += Math.abs(tx.amount);
        entry.count += 1;
        amountMap.set(m, entry);
      }

      const lines = merchantNames.map((m) => {
        const entry = amountMap.get(m);
        const monthlyAmt = entry
          ? fmt(entry.total / Math.max(entry.count, 1))
          : "amount unknown";
        return `- ${m}: ${typeof monthlyAmt === "string" ? monthlyAmt : fmt(0)}/mo`;
      });

      const totalMonthly = Array.from(amountMap.values()).reduce(
        (sum, e) => sum + e.total / Math.max(e.count, 1),
        0
      );

      return `Your confirmed subscriptions:\n${lines.join("\n")}\n\nEstimated total: ${fmt(totalMonthly)}/mo (${fmt(totalMonthly * 12)}/yr)`;
    },
  },
];

/**
 * Try to match a user question against known templates.
 * Returns the direct DB answer if matched, avoiding an LLM call.
 */
export async function tryQuestionTemplate(
  supabase: SupabaseClient,
  question: string
): Promise<TemplateResult> {
  const trimmed = question.trim();

  for (const template of TEMPLATES) {
    const match = trimmed.match(template.pattern);
    if (match) {
      const answer = await template.handler(supabase, match);
      return { matched: true, answer };
    }
  }

  return { matched: false };
}
