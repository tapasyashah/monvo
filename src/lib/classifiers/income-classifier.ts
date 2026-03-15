/**
 * Income classifier for Monvo transactions.
 * Classifies whether a transaction represents income and what type.
 *
 * Income types:
 * - employment: payroll, salary, direct deposit
 * - freelance: freelance payments
 * - transfer_in: Interac e-Transfer received (Fulfill Request)
 * - investment_return: interest, dividends
 * - refund: merchant refunds/returns
 * - other_income: unclassified positive amounts
 */

export type IncomeType =
  | "employment"
  | "freelance"
  | "transfer_in"
  | "investment_return"
  | "refund"
  | "other_income";

export interface IncomeClassification {
  is_income: boolean;
  income_type: IncomeType | null;
  income_confirmed: boolean;
  confidence: number;
}

interface TransactionInput {
  amount: number;
  merchant: string;
  description?: string;
  date: string;
}

// Patterns mapped to income types with confidence levels
const INCOME_PATTERNS: {
  pattern: RegExp;
  type: IncomeType;
  confidence: number;
  confirmed: boolean;
}[] = [
  // Employment / payroll
  {
    pattern: /\b(payroll|salary|direct\s*deposit|pay\s*cheque|paycheque|employer|wages)\b/i,
    type: "employment",
    confidence: 0.95,
    confirmed: true,
  },
  // Freelance
  {
    pattern: /\b(freelance|contractor\s*pay|consulting\s*fee|invoice\s*payment)\b/i,
    type: "freelance",
    confidence: 0.85,
    confirmed: true,
  },
  // Interac e-Transfer received
  {
    pattern: /\b(fulfill\s*request|e-?transfer\s*(?:received|from)|interac\s*(?:received|credit))\b/i,
    type: "transfer_in",
    confidence: 0.9,
    confirmed: true,
  },
  // Investment returns
  {
    pattern: /\b(interest|dividend|dist(?:ribution)?|yield|capital\s*gain)\b/i,
    type: "investment_return",
    confidence: 0.9,
    confirmed: true,
  },
  // Refunds
  {
    pattern: /\b(refund|return|credit\s*adj(?:ustment)?|reversal|cashback)\b/i,
    type: "refund",
    confidence: 0.85,
    confirmed: true,
  },
];

// Patterns that indicate NOT income (internal transfers, CC payments)
const EXCLUSION_PATTERNS: RegExp[] = [
  /\b(transfer\s*(?:to|between)|payment\s*(?:to|from)\s*(?:visa|mastercard|amex|credit\s*card))\b/i,
  /\b(cc\s*payment|credit\s*card\s*payment|balance\s*transfer)\b/i,
  /\b(internal\s*transfer|tfsa\s*(?:contribution|transfer)|rrsp\s*(?:contribution|transfer))\b/i,
  /\b(own\s*account|self\s*transfer)\b/i,
];

/**
 * Classify whether a transaction represents income.
 *
 * Logic:
 * 1. Must have amount > 0 (credit/positive transaction)
 * 2. Must not match exclusion patterns (internal transfers, CC payments)
 * 3. Match against known income patterns
 * 4. Large unknown positives (>$500) flagged for confirmation
 */
export function classifyIncome(transaction: TransactionInput): IncomeClassification {
  const { amount, merchant, description } = transaction;
  const searchText = `${merchant} ${description ?? ""}`.trim();

  // Not income if amount is negative or zero
  if (amount <= 0) {
    return {
      is_income: false,
      income_type: null,
      income_confirmed: false,
      confidence: 1.0,
    };
  }

  // Check exclusion patterns — these are not income even if positive
  for (const exclusion of EXCLUSION_PATTERNS) {
    if (exclusion.test(searchText)) {
      return {
        is_income: false,
        income_type: null,
        income_confirmed: false,
        confidence: 0.9,
      };
    }
  }

  // Match against known income patterns
  for (const { pattern, type, confidence, confirmed } of INCOME_PATTERNS) {
    if (pattern.test(searchText)) {
      return {
        is_income: true,
        income_type: type,
        income_confirmed: confirmed,
        confidence,
      };
    }
  }

  // Large unknown positive amounts — flag as potential income needing confirmation
  if (amount > 500) {
    return {
      is_income: true,
      income_type: "other_income",
      income_confirmed: false,
      confidence: 0.5,
    };
  }

  // Small positive amounts with no pattern match — likely not meaningful income
  return {
    is_income: false,
    income_type: null,
    income_confirmed: false,
    confidence: 0.6,
  };
}
