import { describe, it, expect } from "vitest";
import { CANADIAN_CARDS, getEffectiveRate, mapTransactionCategory } from "../canadian-cards";

describe("CANADIAN_CARDS data integrity", () => {
  it("has at least 6 cards", () => {
    expect(CANADIAN_CARDS.length).toBeGreaterThanOrEqual(6);
  });

  it("all cards have non-empty earn_rates", () => {
    for (const card of CANADIAN_CARDS) {
      expect(card.earn_rates.length).toBeGreaterThan(0);
    }
  });

  it("all cards have valid rewards_type", () => {
    const validTypes = ["cashback", "points", "miles"];
    for (const card of CANADIAN_CARDS) {
      expect(validTypes).toContain(card.rewards_type);
    }
  });

  it("Amex Cobalt has 5x for Restaurants (Dining)", () => {
    const cobalt = CANADIAN_CARDS.find((c) => c.id === "amex-cobalt");
    expect(cobalt).toBeDefined();
    const diningRate = cobalt!.earn_rates.find((r) => r.category === "Dining");
    expect(diningRate).toBeDefined();
    expect(diningRate!.rate).toBe(5);
    expect(diningRate!.rate_type).toBe("multiplier");
  });

  it("has no duplicate card IDs", () => {
    const ids = CANADIAN_CARDS.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all cards have required fields", () => {
    for (const card of CANADIAN_CARDS) {
      expect(typeof card.id).toBe("string");
      expect(card.id.length).toBeGreaterThan(0);
      expect(typeof card.name).toBe("string");
      expect(card.name.length).toBeGreaterThan(0);
      expect(typeof card.issuer).toBe("string");
      expect(typeof card.annual_fee).toBe("number");
      expect(card.annual_fee).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("getEffectiveRate", () => {
  it("returns correct rate for multiplier type (Amex Cobalt Dining)", () => {
    const cobalt = CANADIAN_CARDS.find((c) => c.id === "amex-cobalt")!;
    // 5x multiplier at $0.01/point = 0.05 (5%)
    expect(getEffectiveRate(cobalt, "Dining")).toBe(0.05);
  });

  it("returns correct rate for percent type (CIBC Dividend Groceries)", () => {
    const cibc = CANADIAN_CARDS.find((c) => c.id === "cibc-dividend-vi")!;
    // 4% = 0.04
    expect(getEffectiveRate(cibc, "Groceries")).toBe(0.04);
  });

  it("falls back to Other rate for unknown categories", () => {
    const cobalt = CANADIAN_CARDS.find((c) => c.id === "amex-cobalt")!;
    // Amex Cobalt Other = 1x = 0.01
    expect(getEffectiveRate(cobalt, "SomeUnknownCategory")).toBe(0.01);
  });
});

describe("mapTransactionCategory", () => {
  it("maps Groceries to Groceries", () => {
    expect(mapTransactionCategory("Groceries")).toBe("Groceries");
  });

  it("maps Dining to Dining", () => {
    expect(mapTransactionCategory("Dining")).toBe("Dining");
  });

  it("maps Subscriptions to Recurring", () => {
    expect(mapTransactionCategory("Subscriptions")).toBe("Recurring");
  });

  it("maps unknown categories to Other", () => {
    expect(mapTransactionCategory("SomethingRandom")).toBe("Other");
  });
});
