/**
 * Static lookup of Canadian merchants for transfer classification.
 * Case-insensitive and substring-aware.
 */

export interface MerchantEntry {
  transfer_type: string;
  exclude_from_spending: boolean;
  canonical_name: string;
  category_override?: string;
  business_expense?: boolean;
}

/**
 * Exact-match map: keys are lowercased merchant names.
 * Used for high-confidence (1.0) lookups.
 */
const EXACT_MERCHANTS: Record<string, MerchantEntry> = {
  // Rent
  "hazelview": {
    transfer_type: "rent",
    exclude_from_spending: false,
    canonical_name: "Hazelview Properties",
    category_override: "Housing",
  },
  "hazelview properties": {
    transfer_type: "rent",
    exclude_from_spending: false,
    canonical_name: "Hazelview Properties",
    category_override: "Housing",
  },
  "hazelview property": {
    transfer_type: "rent",
    exclude_from_spending: false,
    canonical_name: "Hazelview Properties",
    category_override: "Housing",
  },

  // Credit card payments
  "amex": {
    transfer_type: "cc_payment",
    exclude_from_spending: true,
    canonical_name: "American Express Payment",
  },
  "american express": {
    transfer_type: "cc_payment",
    exclude_from_spending: true,
    canonical_name: "American Express Payment",
  },
  "amex payment": {
    transfer_type: "cc_payment",
    exclude_from_spending: true,
    canonical_name: "American Express Payment",
  },
  "cibc visa payment": {
    transfer_type: "cc_payment",
    exclude_from_spending: true,
    canonical_name: "CIBC Visa Payment",
  },

  // Investments
  "agf investments": {
    transfer_type: "investment_contribution",
    exclude_from_spending: true,
    canonical_name: "AGF Investments",
    category_override: "Investments",
  },
  "agf investments inc": {
    transfer_type: "investment_contribution",
    exclude_from_spending: true,
    canonical_name: "AGF Investments",
    category_override: "Investments",
  },
  "agf investments inc.": {
    transfer_type: "investment_contribution",
    exclude_from_spending: true,
    canonical_name: "AGF Investments",
    category_override: "Investments",
  },
  "wealthsimple": {
    transfer_type: "investment_contribution",
    exclude_from_spending: true,
    canonical_name: "Wealthsimple",
    category_override: "Investments",
  },
  "wealthsimple inc": {
    transfer_type: "investment_contribution",
    exclude_from_spending: true,
    canonical_name: "Wealthsimple",
    category_override: "Investments",
  },
  "questrade": {
    transfer_type: "investment_contribution",
    exclude_from_spending: true,
    canonical_name: "Questrade",
    category_override: "Investments",
  },

  // Business expenses
  "printful": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Printful",
    business_expense: true,
    category_override: "Business",
  },
  "adcreative": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "AdCreative",
    business_expense: true,
    category_override: "Business",
  },
  "adcreative.ai": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "AdCreative",
    business_expense: true,
    category_override: "Business",
  },
  "shopify": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Shopify",
    business_expense: true,
    category_override: "Business",
  },
  "shopify inc": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Shopify",
    business_expense: true,
    category_override: "Business",
  },

  // Walmart variants (dedup to single canonical name)
  "walmart": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Walmart",
  },
  "walmart canada": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Walmart",
  },
  "walmart.ca": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Walmart",
  },
  "wal-mart": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Walmart",
  },
  "walmart supercentre": {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    canonical_name: "Walmart",
  },
};

/**
 * Substring patterns: if any of these appear anywhere in the lowercased
 * merchant string, the entry applies. Checked when no exact match is found.
 * Confidence: 0.85
 */
const SUBSTRING_MERCHANTS: { pattern: string; entry: MerchantEntry }[] = [
  // Interac patterns
  {
    pattern: "interac e-transfer",
    entry: {
      transfer_type: "interac_out",
      exclude_from_spending: true,
      canonical_name: "Interac e-Transfer",
    },
  },
  {
    pattern: "e-transfer",
    entry: {
      transfer_type: "interac_out",
      exclude_from_spending: true,
      canonical_name: "Interac e-Transfer",
    },
  },
  {
    pattern: "e transfer",
    entry: {
      transfer_type: "interac_out",
      exclude_from_spending: true,
      canonical_name: "Interac e-Transfer",
    },
  },
  {
    pattern: "internet transfer",
    entry: {
      transfer_type: "internal_move",
      exclude_from_spending: true,
      canonical_name: "Online Transfer",
    },
  },
  {
    pattern: "online banking transfer",
    entry: {
      transfer_type: "internal_move",
      exclude_from_spending: true,
      canonical_name: "Online Transfer",
    },
  },
  {
    pattern: "online transfer",
    entry: {
      transfer_type: "internal_move",
      exclude_from_spending: true,
      canonical_name: "Online Transfer",
    },
  },
  // Rent patterns
  {
    pattern: "hazelview",
    entry: {
      transfer_type: "rent",
      exclude_from_spending: false,
      canonical_name: "Hazelview Properties",
      category_override: "Housing",
    },
  },
  // Investment patterns
  {
    pattern: "wealthsimple",
    entry: {
      transfer_type: "investment_contribution",
      exclude_from_spending: true,
      canonical_name: "Wealthsimple",
      category_override: "Investments",
    },
  },
  {
    pattern: "agf invest",
    entry: {
      transfer_type: "investment_contribution",
      exclude_from_spending: true,
      canonical_name: "AGF Investments",
      category_override: "Investments",
    },
  },
  // CC payment patterns
  {
    pattern: "amex",
    entry: {
      transfer_type: "cc_payment",
      exclude_from_spending: true,
      canonical_name: "American Express Payment",
    },
  },
  {
    pattern: "visa payment",
    entry: {
      transfer_type: "cc_payment",
      exclude_from_spending: true,
      canonical_name: "Visa Payment",
    },
  },
  {
    pattern: "mastercard payment",
    entry: {
      transfer_type: "cc_payment",
      exclude_from_spending: true,
      canonical_name: "Mastercard Payment",
    },
  },
  // Business patterns
  {
    pattern: "printful",
    entry: {
      transfer_type: "not_a_transfer",
      exclude_from_spending: false,
      canonical_name: "Printful",
      business_expense: true,
      category_override: "Business",
    },
  },
  {
    pattern: "adcreative",
    entry: {
      transfer_type: "not_a_transfer",
      exclude_from_spending: false,
      canonical_name: "AdCreative",
      business_expense: true,
      category_override: "Business",
    },
  },
  {
    pattern: "shopify",
    entry: {
      transfer_type: "not_a_transfer",
      exclude_from_spending: false,
      canonical_name: "Shopify",
      business_expense: true,
      category_override: "Business",
    },
  },
  // Walmart dedup
  {
    pattern: "walmart",
    entry: {
      transfer_type: "not_a_transfer",
      exclude_from_spending: false,
      canonical_name: "Walmart",
    },
  },
  {
    pattern: "wal-mart",
    entry: {
      transfer_type: "not_a_transfer",
      exclude_from_spending: false,
      canonical_name: "Walmart",
    },
  },
];

/**
 * Look up a merchant by exact (case-insensitive) match.
 * Returns undefined if no match.
 */
export function exactLookup(merchant: string): MerchantEntry | undefined {
  const key = merchant.trim().toLowerCase();
  return EXACT_MERCHANTS[key];
}

/**
 * Look up a merchant by substring (case-insensitive) match.
 * Returns the first matching entry, or undefined.
 */
export function substringLookup(merchant: string): MerchantEntry | undefined {
  const lower = merchant.trim().toLowerCase();
  for (const { pattern, entry } of SUBSTRING_MERCHANTS) {
    if (lower.includes(pattern)) {
      return entry;
    }
  }
  return undefined;
}
