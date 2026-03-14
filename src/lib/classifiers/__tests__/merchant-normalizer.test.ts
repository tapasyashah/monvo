/**
 * Unit tests for merchant normalization.
 *
 * Run with: npx vitest run src/lib/classifiers/__tests__/merchant-normalizer.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  normalizeMerchant,
  canonicalMerchant,
} from "../../merchantNormalize";

describe("normalizeMerchant", () => {
  it("Walmart.ca → Walmart", () => {
    const result = normalizeMerchant("Walmart.ca");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("Walmart");
    expect(result!.category).toBe("Retail");
  });

  it("Walmart Canada → Walmart", () => {
    const result = normalizeMerchant("Walmart Canada");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("Walmart");
  });

  it("OPENAI CHATGPT SUBSCR → OpenAI", () => {
    const result = normalizeMerchant("OPENAI CHATGPT SUBSCR");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("OpenAI");
    expect(result!.category).toBe("Tech");
  });

  it("Westland Express → Westland Insurance", () => {
    const result = normalizeMerchant("Westland Express");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("Westland Insurance");
    expect(result!.category).toBe("Insurance");
  });

  it("SKIPTHEDISHES → SkipTheDishes", () => {
    const result = normalizeMerchant("SKIPTHEDISHES");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("SkipTheDishes");
    expect(result!.is_canadian).toBe(true);
  });

  it("mcdonald's → McDonald's", () => {
    const result = normalizeMerchant("mcdonald's");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("McDonald's");
  });

  it("Tim Horton's → Tim Hortons", () => {
    const result = normalizeMerchant("Tim Horton's");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("Tim Hortons");
  });

  it("LOBLAWS #4421 → Loblaws", () => {
    const result = normalizeMerchant("LOBLAWS #4421");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("Loblaws");
    expect(result!.category).toBe("Groceries");
  });

  it("NETFLIX.COM → Netflix", () => {
    const result = normalizeMerchant("NETFLIX.COM");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("Netflix");
    expect(result!.category).toBe("Streaming");
  });

  it("PETRO-CAN → Petro-Canada", () => {
    const result = normalizeMerchant("PETRO-CAN");
    expect(result).not.toBeNull();
    expect(result!.canonical_name).toBe("Petro-Canada");
    expect(result!.category).toBe("Gas");
    expect(result!.is_canadian).toBe(true);
  });

  it("returns null for unknown merchant", () => {
    expect(normalizeMerchant("Random Local Shop")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeMerchant("")).toBeNull();
  });
});

describe("canonicalMerchant (backward compat)", () => {
  it("returns canonical name for known merchant", () => {
    expect(canonicalMerchant("Walmart Canada")).toBe("Walmart");
  });

  it("returns original name for unknown merchant", () => {
    expect(canonicalMerchant("Random Local Shop")).toBe("Random Local Shop");
  });

  it("returns null for null input", () => {
    expect(canonicalMerchant(null)).toBeNull();
  });

  it("returns empty string for empty string input", () => {
    expect(canonicalMerchant("")).toBe("");
  });
});
