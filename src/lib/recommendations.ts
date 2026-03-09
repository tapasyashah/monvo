import Anthropic from '@anthropic-ai/sdk';

export type RecommendationType = 'hisa' | 'subscription' | 'credit_card' | 'debt';

export interface RecommendationInsert {
  type: RecommendationType;
  title: string;
  body: string;
  trigger_pattern: string;
  estimated_impact: number | null;
}

interface TransactionInput {
  date: string;
  merchant_clean: string | null;
  category: string | null;
  amount: number;
  account_type: string;
  is_recurring: boolean;
}

export function buildTransactionSummary(transactions: TransactionInput[]) {
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

  // Has chequing
  const hasChequing = transactions.some((t) => t.account_type === 'chequing');

  // Average monthly surplus
  const avgMonthlySurplus =
    monthlyFlow.length > 0
      ? Math.round(
          (monthlyFlow.reduce((sum, m) => sum + m.net, 0) / monthlyFlow.length) * 100
        ) / 100
      : 0;

  return {
    dateRange,
    totalTransactions: transactions.length,
    monthlyFlow,
    spendByCategory,
    recurringCharges,
    topCategories,
    hasChequing,
    avgMonthlySurplus,
  };
}

const SYSTEM_PROMPT = `You are a personal finance advisor for Canadian consumers. Generate actionable recommendations based on the user's spending summary.

Return ONLY a raw JSON array. No markdown, no code fences. Your entire response must start with [ and end with ].

Each recommendation object must have EXACTLY these fields:
{
  "type": "hisa" | "subscription" | "credit_card" | "debt",
  "title": "≤60 character title",
  "body": "2-3 sentences with specific numbers from the data",
  "trigger_pattern": "brief description of what data triggered this",
  "estimated_impact": 120.00 or null
}

Rules:
1. hisa: recommend ONLY if avgMonthlySurplus > 200. Suggest EQ Bank HISA (3% interest). estimated_impact = avgMonthlySurplus * 0.03 (monthly interest earned on surplus).
2. subscription: flag if any recurringCharge has monthlyAmount < 50. Title like "Review [Merchant] subscription". estimated_impact = monthlyAmount * 12.
3. credit_card: recommend ONLY if hasChequing is true AND topCategories includes at least one of: dining, restaurants, food, groceries, travel, gas. Suggest a specific Canadian card (Scotia Gold Amex for dining/groceries, TD Aeroplan for travel, Rogers World Elite for everything else). estimated_impact = relevant category total * 0.04 (4% cash back estimate).
4. debt: flag if any category spending increased >20% comparing most recent month to previous month. estimated_impact = null.
5. Generate only recommendations that are triggered by the data. Do not invent ones that aren't triggered.
6. Maximum 4 recommendations total.`;

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
