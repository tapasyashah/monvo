import Anthropic from '@anthropic-ai/sdk';

export type RecommendationType = 'hisa' | 'subscription' | 'credit_card' | 'debt';

export interface RecommendationInsert {
  type: RecommendationType;
  title: string;
  body: string;
  trigger_pattern: string;
  estimated_impact: number | null;
}

export interface UserProfile {
  banks: Array<{ institution: string; account_types: string[]; card_name?: string }>;
  loans: Array<{ type: string; balance: number; rate: number; monthly_payment: number }>;
  registered_accounts: Array<{ type: string; balance: number; contribution_room?: number }>;
  investments: Array<{ type: string; name: string; monthly_contribution: number }>;
}

interface TransactionInput {
  date: string;
  merchant_clean: string | null;
  category: string | null;
  amount: number;
  account_type: string;
  is_recurring: boolean;
}

export function buildTransactionSummary(transactions: TransactionInput[], profile?: UserProfile) {
  // Build monthly flow map
  const monthMap = new Map<string, { totalIn: number; totalOut: number }>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      monthMap.set(month, { totalIn: 0, totalOut: 0 });
    }
    const entry = monthMap.get(month)!;
    if (t.amount > 0) {
      entry.totalIn += t.amount;
    } else {
      entry.totalOut += Math.abs(t.amount);
    }
  }

  // Sort months and take last 6
  const allMonths = Array.from(monthMap.keys()).sort();
  const last6Months = allMonths.slice(-6);
  const monthlyFlow = last6Months.map((month) => {
    const { totalIn, totalOut } = monthMap.get(month)!;
    return {
      month,
      totalIn: Math.round(totalIn * 100) / 100,
      totalOut: Math.round(totalOut * 100) / 100,
      net: Math.round((totalIn - totalOut) * 100) / 100,
    };
  });

  // Date range
  const allDates = transactions.map((t) => t.date).sort();
  const dateRange = {
    start: allDates[0] ?? '',
    end: allDates[allDates.length - 1] ?? '',
  };

  // Spend by category
  const categoryMap = new Map<string, { total: number; months: Set<string> }>();
  for (const t of transactions) {
    if (t.amount < 0) {
      const key = t.category ?? 'Uncategorized';
      const month = t.date.slice(0, 7);
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { total: 0, months: new Set() });
      }
      const entry = categoryMap.get(key)!;
      entry.total += Math.abs(t.amount);
      entry.months.add(month);
    }
  }
  const spendByCategory = Array.from(categoryMap.entries())
    .map(([category, { total, months }]) => ({
      category,
      total: Math.round(total * 100) / 100,
      monthlyAvg: Math.round((total / Math.max(months.size, 1)) * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Top 3 categories
  const topCategories = spendByCategory.slice(0, 3).map((c) => c.category);

  // Recurring charges
  const recurringMap = new Map<string, { total: number; months: Set<string> }>();
  for (const t of transactions) {
    if (t.is_recurring && t.amount < 0) {
      const key = t.merchant_clean ?? 'Unknown';
      const month = t.date.slice(0, 7);
      if (!recurringMap.has(key)) {
        recurringMap.set(key, { total: 0, months: new Set() });
      }
      const entry = recurringMap.get(key)!;
      entry.total += Math.abs(t.amount);
      entry.months.add(month);
    }
  }
  const recurringCharges = Array.from(recurringMap.entries()).map(
    ([merchant, { total, months }]) => ({
      merchant,
      monthlyAmount: Math.round((total / Math.max(months.size, 1)) * 100) / 100,
      monthsObserved: months.size,
    })
  );

  // Has chequing (used as a signal for HISA recommendations)
  const hasChequing = transactions.some((t) => t.account_type === 'chequing');
  // Has credit card data
  const hasCreditCard = transactions.some((t) => t.account_type === 'credit_card');

  // Average monthly surplus
  const avgMonthlySurplus =
    monthlyFlow.length > 0
      ? Math.round(
          (monthlyFlow.reduce((sum, m) => sum + m.net, 0) / monthlyFlow.length) * 100
        ) / 100
      : 0;

  // Profile context
  const profileContext = profile ? {
    ownedCards: profile.banks
      .filter(b => b.account_types.includes('Credit Card') && b.card_name)
      .map(b => b.card_name!),
    hasRRSP: profile.registered_accounts.some(a => a.type === 'RRSP'),
    hasTFSA: profile.registered_accounts.some(a => a.type === 'TFSA'),
    totalLoanDebt: profile.loans.reduce((sum, l) => sum + l.balance, 0),
    monthlyLoanPayment: profile.loans.reduce((sum, l) => sum + l.monthly_payment, 0),
    monthlyInvestmentContribution: profile.investments.reduce((sum, i) => sum + i.monthly_contribution, 0),
  } : null;

  return {
    dateRange,
    totalTransactions: transactions.length,
    monthlyFlow,
    spendByCategory,
    recurringCharges,
    topCategories,
    hasChequing,
    avgMonthlySurplus,
    profileContext,
    hasCreditCard,
  };
}

const SYSTEM_PROMPT = `You are a personal finance advisor for Canadian consumers. Generate actionable, personalized recommendations based on the user's spending summary.

Return ONLY a raw JSON array. No markdown, no code fences. Your entire response must start with [ and end with ].

Each recommendation object must have EXACTLY these fields:
{
  "type": "hisa" | "subscription" | "credit_card" | "debt",
  "title": "≤60 character title",
  "body": "2-3 sentences with specific dollar amounts from the data",
  "trigger_pattern": "brief description of what data triggered this",
  "estimated_impact": 120.00 or null
}

Core rules (always apply):
1. hisa: recommend ONLY if avgMonthlySurplus > 200. Suggest EQ Bank HISA (3.5% interest) or a TFSA HISA. estimated_impact = avgMonthlySurplus * 0.035 (annual interest if investing monthly surplus). Use real numbers: "You average $X surplus/month — parking it in EQ Bank HISA at 3.5% earns $Y/year."
2. subscription: flag recurring charges that look like subscriptions (streaming, gym, apps, cloud storage). Flag ALL of them if monthlyAmount < 100. Title: "Review [Merchant] — $X/mo". estimated_impact = monthlyAmount * 12. Body must name the specific merchant and cost.
3. credit_card: recommend ONLY if topCategories includes any of: Restaurants, Groceries, Transportation, Travel, Entertainment, Shopping (case-insensitive match). Use hasCreditCard to know if the user already has credit card transactions. Suggest the best-fit Canadian card:
   - "Restaurants" or "Groceries" in top 3 → Scotia Gold Amex (6x points on food/groceries, ~4% back)
   - "Travel" in top 3 → TD Aeroplan Visa Infinite (up to 1.5 Aeroplan miles/dollar)
   - "Transportation" or "Shopping" in top 3 → Rogers World Elite Mastercard (3% on USD purchases, 1.5% everywhere)
   estimated_impact = (sum of relevant category totals) * 0.04
   If profileContext is non-null and ownedCards already includes the suggested card name → pick the next-best alternative.
4. debt: flag if any category spending increased >25% month-over-month (most recent vs previous month). estimated_impact = null. Body must name the category and the % increase.

Profile-aware rules (only apply when profileContext is non-null):
5. TFSA gap: if profileContext.hasTFSA is false AND avgMonthlySurplus > 0 AND no hisa recommendation was already generated → add type "hisa" with title "Open a TFSA — Tax-Free Growth" explaining that investing the monthly surplus of $X tax-free in a TFSA beats a regular savings account.
6. Debt servicing: if profileContext.monthlyLoanPayment > 0 AND profileContext.monthlyLoanPayment > avgMonthlySurplus * 0.35 → add type "debt" with title "High Debt-to-Income Ratio" explaining that loan payments of $X represent >35% of surplus. estimated_impact = null.
7. RRSP gap: if profileContext.hasRRSP is false AND any monthlyFlow entry shows totalIn > 2000 → add type "hisa" (savings/investment category) with title "Start Contributing to an RRSP" explaining the tax-deduction benefit. Only add if fewer than 4 recommendations generated so far.

Hard constraints:
- Maximum 4 recommendations total. Prioritize: credit_card > hisa > subscription > debt.
- Never recommend a card the user already owns (check profileContext.ownedCards).
- Every body field MUST include specific dollar amounts from the summary data.
- Only generate recommendations triggered by actual data patterns. Never invent triggers.`;

function isValidRecommendation(r: unknown): r is RecommendationInsert {
  if (typeof r !== 'object' || r === null) return false;
  const obj = r as Record<string, unknown>;
  return (
    (obj.type === 'hisa' ||
      obj.type === 'subscription' ||
      obj.type === 'credit_card' ||
      obj.type === 'debt') &&
    typeof obj.title === 'string' &&
    typeof obj.body === 'string' &&
    typeof obj.trigger_pattern === 'string' &&
    (obj.estimated_impact === null || typeof obj.estimated_impact === 'number')
  );
}

export async function generateRecommendations(
  summary: ReturnType<typeof buildTransactionSummary>
): Promise<RecommendationInsert[]> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify(summary, null, 2),
      },
    ],
  });

  const firstContent = message.content[0];
  if (firstContent.type !== 'text') {
    throw new Error('Claude returned a non-text response');
  }
  const responseText = firstContent.text;

  // Strip markdown code fences if present
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${jsonText.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Claude returned non-array JSON: ${responseText.slice(0, 200)}`);
  }

  const valid = parsed.filter(isValidRecommendation);
  return valid;
}
