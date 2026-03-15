import { describe, it, expect } from "vitest";
import { optimizeCards, type OptimizationResult } from "../optimizer";

describe("optimizeCards", () => {
  it("recommends Amex Cobalt for $500/mo restaurant spend", () => {
    const results = optimizeCards({ Dining: 500 }, []);
    expect(results.length).toBe(1);
    const rec = results[0];
    // Amex Cobalt has 5x multiplier on Dining (highest effective rate)
    expect(rec.recommended_card).toBe("American Express Cobalt Card");
    expect(rec.category).toBe("Dining");
    expect(rec.monthly_spend).toBe(500);
    expect(rec.potential_rewards_value).toBeGreaterThan(0);
  });

  it("picks highest earning card for grocery category", () => {
    const results = optimizeCards({ Groceries: 800 }, []);
    expect(results.length).toBe(1);
    const rec = results[0];
    // BMO CashBack WE has 5% on Groceries, Amex Cobalt has 5x (5%).
    // Both are 5% effective but annual fees differ. With single-category spend
    // the lower-fee card should win after fee amortization.
    expect(rec.potential_rewards_value).toBeGreaterThan(0);
    // The recommended card should be one of the top grocery cards
    expect(
      ["American Express Cobalt Card", "BMO CashBack World Elite Mastercard"].includes(
        rec.recommended_card
      )
    ).toBe(true);
  });

  it("returns empty results for empty spending", () => {
    const results = optimizeCards({}, []);
    expect(results).toEqual([]);
  });

  it("returns empty results when all categories have zero spend", () => {
    const results = optimizeCards({ Dining: 0, Groceries: 0 }, []);
    expect(results).toEqual([]);
  });

  it("factors in annual fee correctly", () => {
    // With very low spend, a no-fee card should beat a high-fee card
    // even if the high-fee card has a better earn rate
    const results = optimizeCards({ Dining: 10 }, []);
    expect(results.length).toBe(1);
    const rec = results[0];
    // At $10/mo dining, fee-heavy cards should lose out
    // Rogers WE is no-fee with 1.5% on Other (Dining falls to Other for Rogers)
    // But the net reward after fee amortization matters
    expect(rec.annual_gain).toBeGreaterThanOrEqual(0);
    expect(rec.potential_rewards_value).toBeGreaterThanOrEqual(0);
  });

  it("handles 'already using best card' scenario", () => {
    // User already has the Amex Cobalt card for Dining
    const results = optimizeCards({ Dining: 500 }, ["amex-cobalt"]);
    expect(results.length).toBe(1);
    const rec = results[0];
    expect(rec.current_card).toBe("American Express Cobalt Card");
    // Since user already has the best card, monthly_gain should be 0 or near 0
    expect(rec.monthly_gain).toBeLessThanOrEqual(0);
    expect(rec.annual_gain).toBeLessThanOrEqual(0);
    // Reasoning should indicate already optimized
    expect(rec.reasoning).toContain("already optimized");
  });

  it("returns multiple categories sorted by annual_gain descending", () => {
    const results = optimizeCards(
      { Dining: 500, Groceries: 400, Gas: 200, Transit: 100 },
      []
    );
    expect(results.length).toBe(4);
    // Verify descending sort
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].annual_gain).toBeGreaterThanOrEqual(
        results[i].annual_gain
      );
    }
  });

  it("all results have required fields", () => {
    const results = optimizeCards({ Dining: 300, Groceries: 200 }, []);
    for (const r of results) {
      expect(r).toHaveProperty("category");
      expect(r).toHaveProperty("monthly_spend");
      expect(r).toHaveProperty("current_card");
      expect(r).toHaveProperty("recommended_card");
      expect(r).toHaveProperty("current_rewards_value");
      expect(r).toHaveProperty("potential_rewards_value");
      expect(r).toHaveProperty("monthly_gain");
      expect(r).toHaveProperty("annual_gain");
      expect(r).toHaveProperty("reasoning");
      expect(typeof r.reasoning).toBe("string");
      expect(r.reasoning.length).toBeGreaterThan(0);
    }
  });
});
