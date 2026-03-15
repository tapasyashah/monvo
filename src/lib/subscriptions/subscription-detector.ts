/**
 * Subscription detection engine.
 *
 * Classifies merchant transaction patterns into subscriptions with
 * confidence scores. Excludes restaurants, groceries, gas stations,
 * and other frequent-but-non-subscription merchants.
 */

import { canonicalMerchant } from "@/lib/merchantNormalize";
import { tagBusinessExpense } from "@/lib/classifiers/business-tagger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionInput {
  date: string;
  amount: number;
  merchant_clean: string | null;
  category: string | null;
  is_recurring: boolean | null;
  expense_context?: string | null;
}

export interface DetectedSubscription {
  merchant: string;
  category: string;
  confidenceScore: number;
  monthlyAmount: number;
  annualEstimate: number;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  expenseContext: string;
  status: "confirmed" | "unconfirmed" | "flagged" | "dismissed";
}

// ---------------------------------------------------------------------------
// Known merchants & exclusions
// ---------------------------------------------------------------------------

const KNOWN_SUBSCRIPTION_MERCHANTS: RegExp[] = [
  /spotify/i,
  /netflix/i,
  /openai/i,
  /disney\+?/i,
  /crave/i,
  /apple\s*(music|tv|one|icloud|arcade)/i,
  /youtube\s*(premium|music)/i,
  /amazon\s*prime/i,
  /adobe/i,
  /figma/i,
  /notion/i,
  /github/i,
  /microsoft\s*365/i,
  /dropbox/i,
  /google\s*(one|workspace|storage)/i,
  /slack/i,
  /zoom/i,
  /canva/i,
  /grammarly/i,
  /nordvpn/i,
  /expressvpn/i,
  /1password/i,
  /lastpass/i,
  /chatgpt/i,
  /anthropic/i,
  /hulu/i,
  /paramount/i,
  /peacock/i,
  /crunchyroll/i,
  /audible/i,
  /kindle\s*unlimited/i,
  /xbox\s*(game\s*pass|live)/i,
  /playstation\s*(plus|now)/i,
  /nintendo\s*(switch\s*online)/i,
  /goodlife/i,
  /anytime\s*fitness/i,
  /planet\s*fitness/i,
  /ymca/i,
  /equinox/i,
  /rogers/i,
  /bell\b/i,
  /telus/i,
  /fido/i,
  /koodo/i,
  /virgin\s*mobile/i,
  /public\s*mobile/i,
  /freedom\s*mobile/i,
  /intact/i,
  /aviva/i,
  /td\s*insurance/i,
  /rbc\s*insurance/i,
  /sunlife/i,
  /manulife/i,
  /great\s*west/i,
  /vercel/i,
  /supabase/i,
  /shopify/i,
  /printful/i,
  /printify/i,
  /stripe/i,
];

/** Merchants that look recurring but are NOT subscriptions. */
const EXCLUSION_PATTERNS: RegExp[] = [
  // Restaurants / fast food
  /mcdonald/i,
  /tim\s*horton/i,
  /starbucks/i,
  /subway/i,
  /wendy/i,
  /burger\s*king/i,
  /popeye/i,
  /a\s*&\s*w\b/i,
  /pizza/i,
  /domino/i,
  /kfc/i,
  /taco\s*bell/i,
  /chipotle/i,
  /five\s*guys/i,
  /harveys/i,
  /swiss\s*chalet/i,
  /boston\s*pizza/i,
  /mary\s*brown/i,
  /doordash/i,
  /uber\s*eats/i,
  /skip\s*the\s*dishes/i,
  /grubhub/i,
  // Grocery
  /loblaws/i,
  /metro\b/i,
  /sobeys/i,
  /no\s*frills/i,
  /freshco/i,
  /food\s*basics/i,
  /superstore/i,
  /safeway/i,
  /save\s*on\s*foods/i,
  /costco/i,
  /walmart/i,
  /wholesale\s*club/i,
  /farm\s*boy/i,
  /longos/i,
  /t\s*&\s*t/i,
  // Gas stations
  /petro\s*canada/i,
  /esso/i,
  /shell/i,
  /canadian\s*tire\s*gas/i,
  /ultramar/i,
  /pioneer/i,
  /husky/i,
  /mobil/i,
  /chevron/i,
  // General retail / one-offs
  /amazon\.ca/i,
  /best\s*buy/i,
  /ikea/i,
  /home\s*depot/i,
  /canadian\s*tire/i,
  /dollarama/i,
  /winners/i,
  /marshalls/i,
  /old\s*navy/i,
];

/** Categories that are never subscriptions. */
const EXCLUDED_CATEGORIES = new Set([
  "Restaurants",
  "Groceries",
  "Gas",
  "Fuel",
  "Dining",
  "Fast Food",
  "Coffee",
]);

// ---------------------------------------------------------------------------
// Subscription classification for display
// ---------------------------------------------------------------------------

function classifySubscriptionCategory(
  merchant: string,
  txCategory: string | null
): string {
  const m = merchant.toLowerCase();
  if (/netflix|spotify|crave|disney|apple tv|prime video|youtube|hulu|paramount|peacock|crunchyroll|audible/.test(m))
    return "Streaming";
  if (/rogers|bell|telus|fido|koodo|virgin|public mobile|freedom mobile/.test(m))
    return "Phone/Internet";
  if (/gym|goodlife|anytime fitness|ymca|equinox|planet fitness/.test(m))
    return "Gym";
  if (/insurance|intact|aviva|td insurance|rbc insurance|sunlife|manulife|great west/.test(m))
    return "Insurance";
  if (/openai|anthropic|chatgpt|adobe|figma|notion|github|vercel|supabase|canva|grammarly|slack|zoom|microsoft|google|dropbox|1password|lastpass/.test(m))
    return "Software";
  if (/shopify|printful|printify|stripe|adcreative/.test(m))
    return "Business Tools";
  if (/nordvpn|expressvpn/.test(m)) return "VPN";
  if (/xbox|playstation|nintendo/.test(m)) return "Gaming";
  if (txCategory) return txCategory;
  return "Other";
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

interface MerchantBucket {
  amounts: number[];
  months: Set<string>;
  dates: string[];
  category: string | null;
  expenseContext: string;
}

function isExcluded(merchant: string, category: string | null): boolean {
  if (EXCLUSION_PATTERNS.some((p) => p.test(merchant))) return true;
  if (category && EXCLUDED_CATEGORIES.has(category)) return true;
  return false;
}

function isKnownSubscription(merchant: string): boolean {
  return KNOWN_SUBSCRIPTION_MERCHANTS.some((p) => p.test(merchant));
}

/**
 * Checks if amounts cluster around a consistent value.
 * Returns true if 60%+ of charges are within $0.50 of the median.
 */
function hasConsistentAmount(amounts: number[]): boolean {
  if (amounts.length < 2) return false;
  const sorted = [...amounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const consistent = amounts.filter((a) => Math.abs(a - median) <= 0.5);
  return consistent.length / amounts.length >= 0.6;
}

/**
 * Checks if charges appear roughly monthly (every 25-35 days on average).
 */
function hasMonthlyPattern(dates: string[]): boolean {
  if (dates.length < 2) return false;
  const sorted = [...dates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1]).getTime();
    const d2 = new Date(sorted[i]).getTime();
    gaps.push((d2 - d1) / (1000 * 60 * 60 * 24));
  }
  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  return avgGap >= 20 && avgGap <= 45;
}

function computeConfidence(
  merchant: string,
  bucket: MerchantBucket
): number {
  const known = isKnownSubscription(merchant);
  const consistent = hasConsistentAmount(bucket.amounts);
  const monthly = hasMonthlyPattern(bucket.dates);
  const count = bucket.amounts.length;

  // Known merchant with 2+ hits => high
  if (known && count >= 2) return 0.90;
  if (known) return 0.75;

  // Same amount, monthly, 3+ => high
  if (consistent && monthly && count >= 3) return 0.85;

  // Same amount, monthly, 2 hits
  if (consistent && monthly && count === 2) return 0.70;

  // Monthly cadence but varying amount, 3+
  if (monthly && count >= 3) return 0.65;

  // Same amount, 3+ but irregular
  if (consistent && count >= 3) return 0.60;

  // 2 occurrences, same amount
  if (consistent && count === 2) return 0.50;

  // Fallback — probably not a subscription
  return 0.30;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function detectSubscriptions(
  transactions: TransactionInput[]
): DetectedSubscription[] {
  // Group spend transactions by canonical merchant
  const buckets = new Map<string, MerchantBucket>();

  for (const tx of transactions) {
    if (tx.amount >= 0) continue; // only outflows
    if (!tx.merchant_clean) continue;

    const merchant =
      canonicalMerchant(tx.merchant_clean) ?? tx.merchant_clean;
    if (isExcluded(merchant, tx.category)) continue;

    if (!buckets.has(merchant)) {
      const bizTag = tagBusinessExpense(merchant);
      buckets.set(merchant, {
        amounts: [],
        months: new Set(),
        dates: [],
        category: tx.category,
        expenseContext: tx.expense_context ?? bizTag?.context ?? "personal",
      });
    }

    const bucket = buckets.get(merchant)!;
    bucket.amounts.push(Math.abs(tx.amount));
    bucket.months.add(tx.date.slice(0, 7));
    bucket.dates.push(tx.date);
  }

  const results: DetectedSubscription[] = [];

  for (const [merchant, bucket] of buckets) {
    // Need at least 2 months or be a known subscription merchant
    if (bucket.months.size < 2 && !isKnownSubscription(merchant)) continue;

    const confidence = computeConfidence(merchant, bucket);
    if (confidence < 0.45) continue; // too low — skip

    const avgAmount =
      bucket.amounts.reduce((s, a) => s + a, 0) / bucket.amounts.length;
    const monthlyAmount = Math.round(avgAmount * 100) / 100;

    const sortedDates = [...bucket.dates].sort();

    results.push({
      merchant,
      category: classifySubscriptionCategory(merchant, bucket.category),
      confidenceScore: confidence,
      monthlyAmount,
      annualEstimate: Math.round(monthlyAmount * 12 * 100) / 100,
      firstSeen: sortedDates[0],
      lastSeen: sortedDates[sortedDates.length - 1],
      occurrenceCount: bucket.amounts.length,
      expenseContext: bucket.expenseContext,
      status: confidence >= 0.85 ? "confirmed" : "unconfirmed",
    });
  }

  // Sort: unconfirmed first, then by monthly amount descending
  return results.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "unconfirmed" ? -1 : 1;
    }
    return b.monthlyAmount - a.monthlyAmount;
  });
}
