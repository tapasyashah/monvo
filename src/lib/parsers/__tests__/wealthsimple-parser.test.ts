import { describe, it, expect } from "vitest";
import { parseWealthsimpleStatement } from "../wealthsimple-parser";

describe("parseWealthsimpleStatement", () => {
  it("extracts total account value of $25,000.00", () => {
    const text = `
      Wealthsimple Annual Statement
      January 1, 2024 to December 31, 2024
      Total account value: $25,000.00
      Contributions this year: $6,000.00
      Withdrawals this year: $0.00
      Investment growth: $1,500.00
    `;
    const result = parseWealthsimpleStatement(text);
    expect(result.total_value).toBe(25000);
    expect(result.institution).toBe("Wealthsimple");
    expect(result.statement_type).toBe("wealthsimple_annual");
  });

  it("extracts contributions of $6,000", () => {
    const text = `
      Wealthsimple TFSA
      January 1, 2024 to December 31, 2024
      Account value: $30,000.00
      Contributions this year: $6,000
      Investment growth: $2,000
    `;
    const result = parseWealthsimpleStatement(text);
    expect(result.ytd_contributions).toBe(6000);
  });

  it("returns 0 defaults for missing fields", () => {
    const text = "This is a mostly empty PDF with no recognizable fields.";
    const result = parseWealthsimpleStatement(text);
    expect(result.total_value).toBe(0);
    expect(result.ytd_contributions).toBe(0);
    expect(result.ytd_withdrawals).toBe(0);
    expect(result.ytd_gains).toBe(0);
    expect(result.period_start).toBe("");
    expect(result.period_end).toBe("");
  });

  it("institution is always Wealthsimple", () => {
    const result = parseWealthsimpleStatement("any text");
    expect(result.institution).toBe("Wealthsimple");
  });

  it("statement_type is always wealthsimple_annual", () => {
    const result = parseWealthsimpleStatement("any text");
    expect(result.statement_type).toBe("wealthsimple_annual");
  });

  it("extracts period dates correctly", () => {
    const text = `
      January 1, 2024 to December 31, 2024
      Total account value: $10,000.00
    `;
    const result = parseWealthsimpleStatement(text);
    expect(result.period_start).toBe("2024-01-01");
    expect(result.period_end).toBe("2024-12-31");
  });

  it("extracts withdrawals", () => {
    const text = `
      January 1, 2024 to December 31, 2024
      Total account value: $20,000.00
      Total withdrawals: $3,500.00
    `;
    const result = parseWealthsimpleStatement(text);
    expect(result.ytd_withdrawals).toBe(3500);
  });

  it("extracts investment growth / gains", () => {
    const text = `
      January 1, 2024 to December 31, 2024
      Account value: $50,000.00
      Investment growth: $4,200.50
    `;
    const result = parseWealthsimpleStatement(text);
    expect(result.ytd_gains).toBe(4200.5);
  });
});
