/**
 * Unit tests for transfer-classifier.
 *
 * Run with: npx vitest run src/lib/classifiers/__tests__/transfer-classifier.test.ts
 * (requires vitest as a dev dependency)
 */

import { describe, it, expect } from "vitest";
import { classifyTransaction } from "../transfer-classifier";

describe("classifyTransaction", () => {
  // ── Rent ────────────────────────────────────────────────────────

  describe("rent classification", () => {
    it("exact match: Hazelview", () => {
      const result = classifyTransaction("Hazelview Properties", -1800);
      expect(result.transfer_type).toBe("rent");
      expect(result.confidence).toBe(1.0);
      expect(result.exclude_from_spending).toBe(false);
      expect(result.canonical_name).toBe("Hazelview Properties");
      expect(result.category_override).toBe("Housing");
    });

    it("case-insensitive match: HAZELVIEW", () => {
      const result = classifyTransaction("HAZELVIEW", -1500);
      expect(result.transfer_type).toBe("rent");
      expect(result.confidence).toBe(1.0);
    });

    it("heuristic: property management in range", () => {
      const result = classifyTransaction("Greenfield Property Management", -1500);
      expect(result.transfer_type).toBe("rent");
      expect(result.confidence).toBe(0.7);
      expect(result.category_override).toBe("Housing");
    });
  });

  // ── CC Payment ──────────────────────────────────────────────────

  describe("cc_payment classification", () => {
    it("exact match: Amex", () => {
      const result = classifyTransaction("Amex", 2500);
      expect(result.transfer_type).toBe("cc_payment");
      expect(result.confidence).toBe(1.0);
      expect(result.exclude_from_spending).toBe(true);
    });

    it("exact match: CIBC Visa Payment", () => {
      const result = classifyTransaction("CIBC Visa Payment", 1200);
      expect(result.transfer_type).toBe("cc_payment");
      expect(result.confidence).toBe(1.0);
      expect(result.exclude_from_spending).toBe(true);
    });

    it("substring match: contains amex", () => {
      const result = classifyTransaction("PAY AMEX COBALT", 500);
      expect(result.transfer_type).toBe("cc_payment");
      expect(result.confidence).toBe(0.85);
    });
  });

  // ── Investment ──────────────────────────────────────────────────

  describe("investment classification", () => {
    it("exact match: Wealthsimple", () => {
      const result = classifyTransaction("Wealthsimple", -500);
      expect(result.transfer_type).toBe("investment_contribution");
      expect(result.confidence).toBe(1.0);
      expect(result.exclude_from_spending).toBe(true);
      expect(result.category_override).toBe("Investments");
    });

    it("exact match: AGF Investments Inc.", () => {
      const result = classifyTransaction("AGF Investments Inc.", -200);
      expect(result.transfer_type).toBe("investment_contribution");
      expect(result.confidence).toBe(1.0);
    });

    it("substring match: Wealthsimple TFSA", () => {
      const result = classifyTransaction("Wealthsimple TFSA Contribution", -300);
      expect(result.transfer_type).toBe("investment_contribution");
      expect(result.confidence).toBe(0.85);
    });
  });

  // ── Business Expense ────────────────────────────────────────────

  describe("business expense classification", () => {
    it("exact match: Printful", () => {
      const result = classifyTransaction("Printful", -45.99);
      expect(result.transfer_type).toBe("not_a_transfer");
      expect(result.business_expense).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.category_override).toBe("Business");
    });

    it("exact match: Shopify", () => {
      const result = classifyTransaction("Shopify", -39);
      expect(result.business_expense).toBe(true);
      expect(result.canonical_name).toBe("Shopify");
    });

    it("substring match: Adcreative.ai charge", () => {
      const result = classifyTransaction("Adcreative.ai Monthly Plan", -99);
      expect(result.business_expense).toBe(true);
      expect(result.confidence).toBe(0.85);
    });
  });

  // ── Dedup (Walmart variants) ────────────────────────────────────

  describe("merchant dedup", () => {
    it("Walmart Canada → Walmart", () => {
      const result = classifyTransaction("Walmart Canada", -55);
      expect(result.canonical_name).toBe("Walmart");
    });

    it("Walmart.ca → Walmart", () => {
      const result = classifyTransaction("Walmart.ca", -30);
      expect(result.canonical_name).toBe("Walmart");
    });

    it("WAL-MART → Walmart (substring)", () => {
      const result = classifyTransaction("WAL-MART SUPERCENTRE #1234", -80);
      expect(result.canonical_name).toBe("Walmart");
      expect(result.confidence).toBe(0.85);
    });
  });

  // ── Interac e-Transfer ──────────────────────────────────────────

  describe("interac e-transfer", () => {
    it("outgoing e-transfer (negative amount)", () => {
      const result = classifyTransaction("Interac e-Transfer to John", -200);
      expect(result.transfer_type).toBe("interac_out");
      expect(result.exclude_from_spending).toBe(true);
      expect(result.confidence).toBe(0.85);
    });

    it("incoming e-transfer (positive amount)", () => {
      const result = classifyTransaction("E-Transfer from Jane", 150);
      expect(result.transfer_type).toBe("interac_in");
      expect(result.exclude_from_spending).toBe(true);
    });
  });

  // ── Income ──────────────────────────────────────────────────────

  describe("income classification", () => {
    it("payroll deposit", () => {
      const result = classifyTransaction("ACME Corp Payroll", 3500);
      expect(result.transfer_type).toBe("income");
      expect(result.exclude_from_spending).toBe(true);
      expect(result.category_override).toBe("Income");
    });

    it("government benefit", () => {
      const result = classifyTransaction("Government of Canada GST Credit", 150);
      expect(result.transfer_type).toBe("income");
      expect(result.confidence).toBe(0.7);
    });
  });

  // ── Unknown transfer ───────────────────────────────────────────

  describe("unknown transfer", () => {
    it("generic transfer keyword", () => {
      const result = classifyTransaction("MISC TRANSFER 12345", -100);
      expect(result.transfer_type).toBe("unknown_transfer");
      expect(result.confidence).toBe(0.7);
      expect(result.exclude_from_spending).toBe(true);
    });
  });

  // ── Default (not a transfer) ────────────────────────────────────

  describe("default not_a_transfer", () => {
    it("ordinary purchase", () => {
      const result = classifyTransaction("Tim Hortons", -4.5);
      expect(result.transfer_type).toBe("not_a_transfer");
      expect(result.confidence).toBe(0.5);
      expect(result.exclude_from_spending).toBe(false);
      expect(result.business_expense).toBe(false);
    });

    it("preserves merchant name as canonical_name", () => {
      const result = classifyTransaction("Loblaws #4421", -85);
      expect(result.canonical_name).toBe("Loblaws #4421");
    });
  });
});
