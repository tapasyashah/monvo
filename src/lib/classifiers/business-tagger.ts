/**
 * Business expense tagger — pattern-based classification of merchants
 * into business expense contexts.
 */

export type ExpenseContext =
  | "personal"
  | "business_bare_thoughts"
  | "business_finnav"
  | "business_factory"
  | "business_other"
  | "investment"
  | "transfer";

export interface BusinessTagResult {
  context: ExpenseContext;
  auto_confirm: boolean;
  note?: string;
}

interface MerchantRule {
  pattern: RegExp;
  context: ExpenseContext;
  auto_confirm: boolean;
  note?: string;
}

const BUSINESS_MERCHANT_RULES: MerchantRule[] = [
  // Bare Thoughts (print-on-demand)
  {
    pattern: /printful/i,
    context: "business_bare_thoughts",
    auto_confirm: true,
    note: "Print-on-demand fulfillment",
  },
  {
    pattern: /printify/i,
    context: "business_bare_thoughts",
    auto_confirm: true,
    note: "Print-on-demand fulfillment",
  },
  {
    pattern: /shopify/i,
    context: "business_bare_thoughts",
    auto_confirm: false,
    note: "Shopify — likely Bare Thoughts storefront",
  },

  // Factory Suite (dev tooling)
  {
    pattern: /adcreative/i,
    context: "business_factory",
    auto_confirm: true,
    note: "Ad creative tooling",
  },
  {
    pattern: /openai/i,
    context: "business_factory",
    auto_confirm: false,
    note: "AI API — likely dev tooling",
  },
  {
    pattern: /anthropic/i,
    context: "business_factory",
    auto_confirm: false,
    note: "AI API — likely dev tooling",
  },
  {
    pattern: /vercel/i,
    context: "business_factory",
    auto_confirm: false,
    note: "Hosting — likely dev infrastructure",
  },
  {
    pattern: /github/i,
    context: "business_factory",
    auto_confirm: false,
    note: "Code hosting — likely dev infrastructure",
  },
  {
    pattern: /supabase/i,
    context: "business_factory",
    auto_confirm: false,
    note: "Database — likely dev infrastructure",
  },
  {
    pattern: /figma/i,
    context: "business_factory",
    auto_confirm: false,
    note: "Design tool — likely dev tooling",
  },
  {
    pattern: /notion/i,
    context: "business_factory",
    auto_confirm: false,
    note: "Workspace tool — likely dev operations",
  },

  // Finnav
  {
    pattern: /stripe/i,
    context: "business_finnav",
    auto_confirm: false,
    note: "Payment processing — likely Finnav",
  },
];

/**
 * Checks a merchant name against known business patterns.
 * Returns a tag result if matched, or null for personal expenses.
 */
export function tagBusinessExpense(
  merchant: string
): BusinessTagResult | null {
  const normalized = merchant.trim();
  if (!normalized) return null;

  for (const rule of BUSINESS_MERCHANT_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        context: rule.context,
        auto_confirm: rule.auto_confirm,
        note: rule.note,
      };
    }
  }

  return null;
}
