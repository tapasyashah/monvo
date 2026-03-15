import { describe, it, expect } from "vitest";
import { detectStatementType, isInvestmentStatement } from "../statement-types";

describe("detectStatementType", () => {
  it('text containing "Wealthsimple" returns wealthsimple_annual', () => {
    expect(
      detectStatementType("Your Wealthsimple Annual Statement 2024")
    ).toBe("wealthsimple_annual");
  });

  it("is case-insensitive for Wealthsimple", () => {
    expect(detectStatementType("account with WEALTHSIMPLE")).toBe(
      "wealthsimple_annual"
    );
    expect(detectStatementType("wealthsimple report")).toBe(
      "wealthsimple_annual"
    );
  });

  it('text containing "Primerica" returns primerica_annual', () => {
    expect(
      detectStatementType("Primerica Financial Services Annual Report")
    ).toBe("primerica_annual");
  });

  it('text containing "CIBC" + "credit" returns cibc_credit', () => {
    expect(
      detectStatementType("CIBC Visa Credit Card Statement")
    ).toBe("cibc_credit");
  });

  it("is case-insensitive for CIBC credit", () => {
    expect(
      detectStatementType("cibc credit card summary")
    ).toBe("cibc_credit");
  });

  it('text containing "CIBC" only returns cibc_bank', () => {
    expect(
      detectStatementType("CIBC Chequing Account Statement")
    ).toBe("cibc_bank");
  });

  it("random text returns unknown", () => {
    expect(detectStatementType("Some random bank statement")).toBe("unknown");
  });

  it("empty text returns unknown", () => {
    expect(detectStatementType("")).toBe("unknown");
  });
});

describe("isInvestmentStatement", () => {
  it("returns true for wealthsimple_annual", () => {
    expect(isInvestmentStatement("wealthsimple_annual")).toBe(true);
  });

  it("returns true for primerica_annual", () => {
    expect(isInvestmentStatement("primerica_annual")).toBe(true);
  });

  it("returns false for cibc_bank", () => {
    expect(isInvestmentStatement("cibc_bank")).toBe(false);
  });

  it("returns false for cibc_credit", () => {
    expect(isInvestmentStatement("cibc_credit")).toBe(false);
  });

  it("returns false for unknown", () => {
    expect(isInvestmentStatement("unknown")).toBe(false);
  });
});
