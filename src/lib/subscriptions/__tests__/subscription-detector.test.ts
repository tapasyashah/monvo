import { describe, it, expect } from "vitest";
import { detectSubscriptions, type TransactionInput } from "../subscription-detector";

/** Helper: generate monthly transactions for a merchant. */
function monthlyTxs(
  merchantClean: string,
  amount: number,
  count: number,
  startMonth: string = "2025-10",
  category: string | null = null,
): TransactionInput[] {
  const txs: TransactionInput[] = [];
  for (let i = 0; i < count; i++) {
    const [y, m] = startMonth.split("-").map(Number);
    const month = m + i;
    const year = y + Math.floor((month - 1) / 12);
    const mo = ((month - 1) % 12) + 1;
    txs.push({
      date: `${year}-${String(mo).padStart(2, "0")}-15`,
      amount: -Math.abs(amount),
      merchant_clean: merchantClean,
      category,
      is_recurring: null,
    });
  }
  return txs;
}

describe("detectSubscriptions", () => {
  // ── Excluded restaurants ─────────────────────────────────────────────
  it("McDonald's with 5 visits is NOT a subscription", () => {
    const txs = monthlyTxs("McDonald's", 12.99, 5, "2025-06", "Restaurants");
    const results = detectSubscriptions(txs);
    const mcds = results.find((r) => /mcdonald/i.test(r.merchant));
    expect(mcds).toBeUndefined();
  });

  // ── Spotify: known subscription ──────────────────────────────────────
  it("Spotify with 3 monthly charges at same amount IS a subscription, high confidence", () => {
    const txs = monthlyTxs("Spotify", 11.99, 3);
    const results = detectSubscriptions(txs);
    const spotify = results.find((r) => /spotify/i.test(r.merchant));
    expect(spotify).toBeDefined();
    expect(spotify!.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(spotify!.occurrenceCount).toBe(3);
  });

  // ── 2 occurrences ────────────────────────────────────────────────────
  it("unknown merchant with only 2 occurrences -> medium confidence", () => {
    // A merchant not in known list, not excluded, 2 months
    const txs = monthlyTxs("Acme SaaS Tool", 29.99, 2);
    const results = detectSubscriptions(txs);
    const acme = results.find((r) => /acme/i.test(r.merchant));
    expect(acme).toBeDefined();
    // 2 occurrences with consistent amount and monthly pattern => 0.70
    expect(acme!.confidenceScore).toBeLessThan(0.85);
    expect(acme!.confidenceScore).toBeGreaterThanOrEqual(0.45);
  });

  // ── Excluded grocery ─────────────────────────────────────────────────
  it("Loblaws is NOT a subscription even with many visits", () => {
    const txs = monthlyTxs("Loblaws", 85, 6, "2025-04", "Groceries");
    const results = detectSubscriptions(txs);
    const loblaws = results.find((r) => /loblaw/i.test(r.merchant));
    expect(loblaws).toBeUndefined();
  });

  // ── Netflix: known subscription with only 2 occurrences ──────────────
  it("Netflix with 2 occurrences -> high confidence (known merchant)", () => {
    const txs = monthlyTxs("Netflix", 16.99, 2);
    const results = detectSubscriptions(txs);
    const netflix = results.find((r) => /netflix/i.test(r.merchant));
    expect(netflix).toBeDefined();
    expect(netflix!.confidenceScore).toBeGreaterThanOrEqual(0.9);
  });

  // ── Positive amounts are ignored ─────────────────────────────────────
  it("positive amounts (income) are ignored", () => {
    const txs: TransactionInput[] = [
      { date: "2025-11-15", amount: 11.99, merchant_clean: "Spotify", category: null, is_recurring: null },
      { date: "2025-12-15", amount: 11.99, merchant_clean: "Spotify", category: null, is_recurring: null },
    ];
    const results = detectSubscriptions(txs);
    expect(results).toHaveLength(0);
  });

  // ── Empty transactions ───────────────────────────────────────────────
  it("empty transaction list returns no subscriptions", () => {
    const results = detectSubscriptions([]);
    expect(results).toHaveLength(0);
  });

  // ── Monthly amount and annual estimate ───────────────────────────────
  it("computes correct monthlyAmount and annualEstimate", () => {
    const txs = monthlyTxs("Spotify", 11.99, 3);
    const results = detectSubscriptions(txs);
    const spotify = results.find((r) => /spotify/i.test(r.merchant));
    expect(spotify).toBeDefined();
    expect(spotify!.monthlyAmount).toBeCloseTo(11.99, 2);
    expect(spotify!.annualEstimate).toBeCloseTo(11.99 * 12, 2);
  });

  // ── Status confirmed vs unconfirmed ──────────────────────────────────
  it("high confidence subscription has status=confirmed", () => {
    const txs = monthlyTxs("Netflix", 16.99, 3);
    const results = detectSubscriptions(txs);
    const netflix = results.find((r) => /netflix/i.test(r.merchant));
    expect(netflix).toBeDefined();
    expect(netflix!.status).toBe("confirmed");
  });
});
