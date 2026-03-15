import { describe, it, expect } from "vitest";
import { tagBusinessExpense } from "../business-tagger";

describe("tagBusinessExpense", () => {
  // ── Bare Thoughts ──────────────────────────────────────────────────────
  it("Printful -> business_bare_thoughts, auto_confirm=true", () => {
    const result = tagBusinessExpense("Printful Order #12345");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_bare_thoughts");
    expect(result!.auto_confirm).toBe(true);
  });

  it("Shopify -> business_bare_thoughts, auto_confirm=false", () => {
    const result = tagBusinessExpense("Shopify*BareThoughts");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_bare_thoughts");
    expect(result!.auto_confirm).toBe(false);
  });

  // ── Factory Suite ──────────────────────────────────────────────────────
  it("Adcreative -> business_factory, auto_confirm=true", () => {
    const result = tagBusinessExpense("ADCREATIVE.AI");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_factory");
    expect(result!.auto_confirm).toBe(true);
  });

  it("OpenAI -> business_factory", () => {
    const result = tagBusinessExpense("OpenAI API Usage");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_factory");
  });

  // ── Finnav ─────────────────────────────────────────────────────────────
  it("Stripe -> business_finnav", () => {
    const result = tagBusinessExpense("Stripe Payments");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_finnav");
  });

  // ── Unknown merchant ──────────────────────────────────────────────────
  it("Unknown merchant (Tim Hortons) -> returns null", () => {
    const result = tagBusinessExpense("Tim Hortons");
    expect(result).toBeNull();
  });

  it("Empty string -> returns null", () => {
    const result = tagBusinessExpense("");
    expect(result).toBeNull();
  });

  it("Whitespace-only string -> returns null", () => {
    const result = tagBusinessExpense("   ");
    expect(result).toBeNull();
  });

  // ── Case insensitivity ────────────────────────────────────────────────
  it("case insensitivity: 'PRINTFUL' matches", () => {
    const result = tagBusinessExpense("PRINTFUL");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_bare_thoughts");
  });

  it("case insensitivity: 'openai' lowercase matches", () => {
    const result = tagBusinessExpense("openai");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_factory");
  });

  it("case insensitivity: 'ShOpIfY' mixed case matches", () => {
    const result = tagBusinessExpense("ShOpIfY");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_bare_thoughts");
  });

  it("case insensitivity: 'STRIPE' uppercase matches business_finnav", () => {
    const result = tagBusinessExpense("STRIPE");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_finnav");
  });

  // ── Additional factory merchants ──────────────────────────────────────
  it("Anthropic -> business_factory", () => {
    const result = tagBusinessExpense("Anthropic Claude");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_factory");
  });

  it("Vercel -> business_factory", () => {
    const result = tagBusinessExpense("Vercel Inc");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_factory");
  });

  it("GitHub -> business_factory", () => {
    const result = tagBusinessExpense("GitHub Pro");
    expect(result).not.toBeNull();
    expect(result!.context).toBe("business_factory");
  });
});
