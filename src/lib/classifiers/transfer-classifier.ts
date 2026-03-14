/**
 * Transfer classifier for Monvo transactions.
 *
 * Classification cascade:
 *   1. Exact merchant match   → confidence 1.0
 *   2. Substring match        → confidence 0.85
 *   3. Heuristics (amount/pattern) → confidence 0.7
 *   4. Default not_a_transfer → confidence 0.5
 */

import { exactLookup, substringLookup } from "./merchant-map";

export interface ClassificationResult {
  transfer_type: string;
  exclude_from_spending: boolean;
  business_expense: boolean;
  canonical_name: string;
  confidence: number;
  category_override?: string;
}

// ── Heuristic patterns ────────────────────────────────────────────

/** Patterns that suggest income */
const INCOME_PATTERNS = [
  /\bpayroll\b/i,
  /\bdirect deposit\b/i,
  /\bsalary\b/i,
  /\bemployment insurance\b/i,
  /\bgov(ernment)?\s*(of\s*)?canada\b/i,
  /\bcra\b/i,
  /\bgst.*credit\b/i,
  /\bhst.*credit\b/i,
  /\btrillium\b/i,
  /\bcanada child\b/i,
];

/** Patterns that suggest rent */
const RENT_AMOUNT_RANGE = { min: 800, max: 4000 };

/** Patterns that suggest credit card payment */
const CC_PAYMENT_PATTERNS = [
  /\bpayment.*(?:visa|mc|mastercard|amex|american express)\b/i,
  /\b(?:visa|mc|mastercard|amex|american express).*payment\b/i,
];

// ── Main classifier ──────────────────────────────────────────────

export function classifyTransaction(
  merchant: string,
  amount: number,
  description?: string
): ClassificationResult {
  const merchantStr = merchant ?? "";
  const descStr = description ?? "";
  const combined = `${merchantStr} ${descStr}`.trim();

  // 1. Exact match → confidence 1.0
  const exact = exactLookup(merchantStr);
  if (exact) {
    return {
      transfer_type: exact.transfer_type,
      exclude_from_spending: exact.exclude_from_spending,
      business_expense: exact.business_expense ?? false,
      canonical_name: exact.canonical_name,
      confidence: 1.0,
      category_override: exact.category_override,
    };
  }

  // 2. Substring match → confidence 0.85
  const partial = substringLookup(merchantStr) ?? substringLookup(combined);
  if (partial) {
    // For Interac e-Transfer, determine direction from amount sign
    let transferType = partial.transfer_type;
    if (transferType === "interac_out" && amount > 0) {
      transferType = "interac_in";
    }

    return {
      transfer_type: transferType,
      exclude_from_spending: partial.exclude_from_spending,
      business_expense: partial.business_expense ?? false,
      canonical_name: partial.canonical_name,
      confidence: 0.85,
      category_override: partial.category_override,
    };
  }

  // 3. Heuristics → confidence 0.7

  // Income detection
  if (amount > 0 && INCOME_PATTERNS.some((p) => p.test(combined))) {
    return {
      transfer_type: "income",
      exclude_from_spending: true,
      business_expense: false,
      canonical_name: merchantStr || "Income",
      confidence: 0.7,
      category_override: "Income",
    };
  }

  // CC payment heuristic (large positive amount with payment keyword)
  if (amount > 0 && CC_PAYMENT_PATTERNS.some((p) => p.test(combined))) {
    return {
      transfer_type: "cc_payment",
      exclude_from_spending: true,
      business_expense: false,
      canonical_name: merchantStr || "Credit Card Payment",
      confidence: 0.7,
    };
  }

  // Rent heuristic: large negative amount on a recurring-looking merchant
  // with "property", "management", "realty", "landlord" in name
  const absAmount = Math.abs(amount);
  if (
    amount < 0 &&
    absAmount >= RENT_AMOUNT_RANGE.min &&
    absAmount <= RENT_AMOUNT_RANGE.max &&
    /\b(propert|management|realty|landlord|rental|lease)\b/i.test(combined)
  ) {
    return {
      transfer_type: "rent",
      exclude_from_spending: false,
      business_expense: false,
      canonical_name: merchantStr,
      confidence: 0.7,
      category_override: "Housing",
    };
  }

  // Unknown transfer heuristic: "transfer" in name but not yet matched
  if (/\btransfer\b/i.test(combined)) {
    return {
      transfer_type: "unknown_transfer",
      exclude_from_spending: true,
      business_expense: false,
      canonical_name: merchantStr || "Transfer",
      confidence: 0.7,
    };
  }

  // 4. Default: not a transfer → confidence 0.5
  return {
    transfer_type: "not_a_transfer",
    exclude_from_spending: false,
    business_expense: false,
    canonical_name: merchantStr,
    confidence: 0.5,
  };
}
