import { describe, it, expect } from "vitest";
import { computeDailySpendData, getNotableDays, type TxRow } from "../heatmap";

function makeTx(overrides: Partial<TxRow>): TxRow {
  return {
    date: "2026-01-15",
    amount: 0,
    category: null,
    merchant_clean: null,
    is_recurring: null,
    transaction_type: null,
    account_type: null,
    ...overrides,
  };
}

describe("computeDailySpendData", () => {
  it("3 transactions on different days -> correct per-day totals", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-05", amount: -50, merchant_clean: "Loblaws" }),
      makeTx({ date: "2026-01-10", amount: -30, merchant_clean: "Tim Hortons" }),
      makeTx({ date: "2026-01-20", amount: -120, merchant_clean: "Amazon" }),
    ];

    const result = computeDailySpendData(txs, 2026, 0); // January = month 0
    expect(result.days).toHaveLength(31); // January has 31 days

    const day5 = result.days.find((d) => d.date === "2026-01-05");
    expect(day5).toBeDefined();
    expect(day5!.total_spent).toBe(50);
    expect(day5!.transaction_count).toBe(1);

    const day10 = result.days.find((d) => d.date === "2026-01-10");
    expect(day10!.total_spent).toBe(30);

    const day20 = result.days.find((d) => d.date === "2026-01-20");
    expect(day20!.total_spent).toBe(120);
  });

  it("top merchant identified correctly when multiple on same day", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-15", amount: -20, merchant_clean: "Tim Hortons" }),
      makeTx({ date: "2026-01-15", amount: -80, merchant_clean: "Costco" }),
      makeTx({ date: "2026-01-15", amount: -15, merchant_clean: "Tim Hortons" }),
    ];

    const result = computeDailySpendData(txs, 2026, 0);
    const day15 = result.days.find((d) => d.date === "2026-01-15");
    expect(day15).toBeDefined();
    expect(day15!.total_spent).toBe(115);
    expect(day15!.transaction_count).toBe(3);
    // Costco has $80, Tim Hortons has $35 total => Costco is top
    expect(day15!.top_merchant).toBe("Costco");
  });

  it("income day has has_income=true", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-15", amount: 3000, merchant_clean: "Employer Payroll" }),
      makeTx({ date: "2026-01-15", amount: -50, merchant_clean: "Starbucks" }),
    ];

    const result = computeDailySpendData(txs, 2026, 0);
    const day15 = result.days.find((d) => d.date === "2026-01-15");
    expect(day15!.has_income).toBe(true);
    // Only spend is counted in total_spent (income is not)
    expect(day15!.total_spent).toBe(50);
  });

  it("day with only income has has_income=true and total_spent=0", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-05", amount: 5000, merchant_clean: "Payroll" }),
    ];

    const result = computeDailySpendData(txs, 2026, 0);
    const day5 = result.days.find((d) => d.date === "2026-01-05");
    expect(day5!.has_income).toBe(true);
    expect(day5!.total_spent).toBe(0);
  });

  it("empty transactions -> all zero days", () => {
    const result = computeDailySpendData([], 2026, 0);
    expect(result.days).toHaveLength(31);
    for (const day of result.days) {
      expect(day.total_spent).toBe(0);
      expect(day.transaction_count).toBe(0);
      expect(day.has_income).toBe(false);
      expect(day.top_merchant).toBe("\u2014"); // em dash default
    }
    expect(result.averageDailySpend).toBe(0);
  });

  it("averageDailySpend is computed over all days in the month", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-10", amount: -310, merchant_clean: "Store" }),
    ];

    const result = computeDailySpendData(txs, 2026, 0);
    // $310 spread over 31 days = 10.00
    expect(result.averageDailySpend).toBe(10);
  });
});

describe("getNotableDays", () => {
  it("notable days sorted by spend descending", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-05", amount: -50, merchant_clean: "A" }),
      makeTx({ date: "2026-01-10", amount: -200, merchant_clean: "B" }),
      makeTx({ date: "2026-01-15", amount: -100, merchant_clean: "C" }),
    ];

    const { days, averageDailySpend } = computeDailySpendData(txs, 2026, 0);
    const notable = getNotableDays(days, averageDailySpend);

    expect(notable.length).toBeGreaterThanOrEqual(3);
    expect(notable[0].total_spent).toBe(200);
    expect(notable[1].total_spent).toBe(100);
    expect(notable[2].total_spent).toBe(50);
  });

  it("respects topN limit", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-01", amount: -10, merchant_clean: "A" }),
      makeTx({ date: "2026-01-02", amount: -20, merchant_clean: "B" }),
      makeTx({ date: "2026-01-03", amount: -30, merchant_clean: "C" }),
      makeTx({ date: "2026-01-04", amount: -40, merchant_clean: "D" }),
    ];

    const { days, averageDailySpend } = computeDailySpendData(txs, 2026, 0);
    const notable = getNotableDays(days, averageDailySpend, 2);
    expect(notable).toHaveLength(2);
    expect(notable[0].total_spent).toBe(40);
    expect(notable[1].total_spent).toBe(30);
  });

  it("multipleOfAvg is calculated correctly", () => {
    const txs: TxRow[] = [
      makeTx({ date: "2026-01-10", amount: -310, merchant_clean: "Big Store" }),
    ];

    const { days, averageDailySpend } = computeDailySpendData(txs, 2026, 0);
    // averageDailySpend = 310 / 31 = 10
    const notable = getNotableDays(days, averageDailySpend);
    expect(notable).toHaveLength(1);
    // 310 / 10 = 31.0
    expect(notable[0].multipleOfAvg).toBe(31);
  });

  it("empty days produce no notable days", () => {
    const { days, averageDailySpend } = computeDailySpendData([], 2026, 0);
    const notable = getNotableDays(days, averageDailySpend);
    expect(notable).toHaveLength(0);
  });
});
