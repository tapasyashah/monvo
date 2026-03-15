import { describe, it, expect } from "vitest";
import { classifyIncome } from "../income-classifier";

describe("classifyIncome", () => {
  // ── Positive payroll ──────────────────────────────────────────────────
  it("payroll deposit -> is_income=true, income_type=employment", () => {
    const result = classifyIncome({
      amount: 2500,
      merchant: "ACME Corp Payroll",
      date: "2026-01-15",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("employment");
    expect(result.income_confirmed).toBe(true);
  });

  it("salary deposit -> is_income=true, income_type=employment", () => {
    const result = classifyIncome({
      amount: 3000,
      merchant: "Employer",
      description: "Salary Direct Deposit",
      date: "2026-01-30",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("employment");
  });

  // ── Interac incoming ──────────────────────────────────────────────────
  it("Fulfill Request -> is_income=true, income_type=transfer_in", () => {
    const result = classifyIncome({
      amount: 150,
      merchant: "Interac",
      description: "Fulfill Request from John",
      date: "2026-02-10",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("transfer_in");
  });

  it("e-Transfer received -> is_income=true, income_type=transfer_in", () => {
    const result = classifyIncome({
      amount: 200,
      merchant: "E-Transfer Received",
      date: "2026-02-12",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("transfer_in");
  });

  // ── Investment return ─────────────────────────────────────────────────
  it("interest/dividend -> is_income=true, income_type=investment_return", () => {
    const result = classifyIncome({
      amount: 45.23,
      merchant: "TD Canada Trust",
      description: "Interest Payment",
      date: "2026-03-01",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("investment_return");
  });

  it("dividend payment -> investment_return", () => {
    const result = classifyIncome({
      amount: 120,
      merchant: "Questrade",
      description: "Dividend Distribution",
      date: "2026-03-15",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("investment_return");
  });

  // ── Refund ────────────────────────────────────────────────────────────
  it("refund -> is_income=true, income_type=refund", () => {
    const result = classifyIncome({
      amount: 79.99,
      merchant: "Amazon Refund",
      date: "2026-01-20",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("refund");
  });

  // ── Negative amount ───────────────────────────────────────────────────
  it("negative amount -> is_income=false (spending, not income)", () => {
    const result = classifyIncome({
      amount: -50,
      merchant: "Payroll Deposit Store",
      date: "2026-01-15",
    });
    expect(result.is_income).toBe(false);
    expect(result.income_type).toBeNull();
  });

  it("zero amount -> is_income=false", () => {
    const result = classifyIncome({
      amount: 0,
      merchant: "Payroll",
      date: "2026-01-15",
    });
    expect(result.is_income).toBe(false);
  });

  // ── Large unknown positive ────────────────────────────────────────────
  it("large unknown positive (>$500) -> is_income=true, income_confirmed=false", () => {
    const result = classifyIncome({
      amount: 750,
      merchant: "Random Person",
      date: "2026-02-05",
    });
    expect(result.is_income).toBe(true);
    expect(result.income_type).toBe("other_income");
    expect(result.income_confirmed).toBe(false);
  });

  it("small unknown positive (<=$500) -> is_income=false", () => {
    const result = classifyIncome({
      amount: 100,
      merchant: "Random Person",
      date: "2026-02-05",
    });
    expect(result.is_income).toBe(false);
  });

  // ── Known non-income positive (exclusions) ────────────────────────────
  it("CC payment -> NOT classified as income", () => {
    const result = classifyIncome({
      amount: 1200,
      merchant: "CIBC",
      description: "Payment to Visa Credit Card",
      date: "2026-01-25",
    });
    expect(result.is_income).toBe(false);
  });

  it("internal transfer -> NOT classified as income", () => {
    const result = classifyIncome({
      amount: 500,
      merchant: "TD Bank",
      description: "Internal Transfer between accounts",
      date: "2026-01-28",
    });
    expect(result.is_income).toBe(false);
  });

  it("TFSA contribution -> NOT classified as income", () => {
    const result = classifyIncome({
      amount: 600,
      merchant: "Wealthsimple",
      description: "TFSA Contribution",
      date: "2026-02-01",
    });
    expect(result.is_income).toBe(false);
  });

  it("credit card payment -> NOT classified as income", () => {
    const result = classifyIncome({
      amount: 800,
      merchant: "Bank",
      description: "CC Payment to Mastercard",
      date: "2026-03-01",
    });
    expect(result.is_income).toBe(false);
  });

  it("balance transfer -> NOT classified as income", () => {
    const result = classifyIncome({
      amount: 2000,
      merchant: "RBC",
      description: "Balance Transfer",
      date: "2026-03-05",
    });
    expect(result.is_income).toBe(false);
  });
});
