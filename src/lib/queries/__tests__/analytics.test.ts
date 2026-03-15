import { describe, it, expect } from "vitest";
import { getWaterfallData, type TxRow } from "../analytics";

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

describe("getWaterfallData", () => {
  it("1 income + 2 expenses -> 4 bars (income, 2 expenses, surplus)", () => {
    const txs: TxRow[] = [
      makeTx({ amount: 5000, date: "2026-01-05" }),
      makeTx({ amount: -1200, date: "2026-01-10", category: "Rent" }),
      makeTx({ amount: -300, date: "2026-01-15", category: "Groceries" }),
    ];

    const bars = getWaterfallData(txs, "2026-01");
    expect(bars).toHaveLength(4);

    // First bar: income
    expect(bars[0].name).toBe("Income");
    expect(bars[0].value).toBe(5000);
    expect(bars[0].type).toBe("income");

    // Expense bars sorted by total descending
    expect(bars[1].name).toBe("Rent");
    expect(bars[1].value).toBe(1200);
    expect(bars[1].type).toBe("expense");

    expect(bars[2].name).toBe("Groceries");
    expect(bars[2].value).toBe(300);
    expect(bars[2].type).toBe("expense");

    // Surplus bar
    expect(bars[3].name).toBe("Surplus");
    expect(bars[3].value).toBe(3500);
    expect(bars[3].type).toBe("surplus");
  });

  it("zero income -> all expense + deficit bar", () => {
    const txs: TxRow[] = [
      makeTx({ amount: -500, date: "2026-02-10", category: "Utilities" }),
      makeTx({ amount: -200, date: "2026-02-15", category: "Groceries" }),
    ];

    const bars = getWaterfallData(txs, "2026-02");
    expect(bars).toHaveLength(4); // income(0), 2 expenses, deficit

    expect(bars[0].name).toBe("Income");
    expect(bars[0].value).toBe(0);

    // Last bar: deficit
    const lastBar = bars[bars.length - 1];
    expect(lastBar.name).toBe("Deficit");
    expect(lastBar.type).toBe("deficit");
    expect(lastBar.value).toBe(700);
  });

  it("income equals expenses -> surplus bar with value 0", () => {
    const txs: TxRow[] = [
      makeTx({ amount: 1000, date: "2026-03-01" }),
      makeTx({ amount: -600, date: "2026-03-10", category: "Rent" }),
      makeTx({ amount: -400, date: "2026-03-15", category: "Food" }),
    ];

    const bars = getWaterfallData(txs, "2026-03");
    const lastBar = bars[bars.length - 1];
    expect(lastBar.name).toBe("Surplus");
    expect(lastBar.value).toBe(0);
    expect(lastBar.type).toBe("surplus");
  });

  it("filtering by month works correctly", () => {
    const txs: TxRow[] = [
      makeTx({ amount: 3000, date: "2026-01-05" }),
      makeTx({ amount: -500, date: "2026-01-10", category: "Rent" }),
      makeTx({ amount: 4000, date: "2026-02-05" }), // different month
      makeTx({ amount: -800, date: "2026-02-10", category: "Rent" }),
    ];

    const janBars = getWaterfallData(txs, "2026-01");
    expect(janBars[0].value).toBe(3000); // January income only
    expect(janBars[1].value).toBe(500);  // January rent only

    const febBars = getWaterfallData(txs, "2026-02");
    expect(febBars[0].value).toBe(4000); // February income only
    expect(febBars[1].value).toBe(800);  // February rent only
  });

  it("no month filter uses all rows", () => {
    const txs: TxRow[] = [
      makeTx({ amount: 1000, date: "2026-01-05" }),
      makeTx({ amount: 2000, date: "2026-02-05" }),
      makeTx({ amount: -500, date: "2026-01-10", category: "Groceries" }),
    ];

    const bars = getWaterfallData(txs);
    expect(bars[0].value).toBe(3000); // total income from both months
  });

  it("running totals are calculated correctly", () => {
    const txs: TxRow[] = [
      makeTx({ amount: 5000, date: "2026-01-05" }),
      makeTx({ amount: -2000, date: "2026-01-10", category: "Rent" }),
      makeTx({ amount: -1000, date: "2026-01-15", category: "Food" }),
    ];

    const bars = getWaterfallData(txs, "2026-01");
    expect(bars[0].runningTotal).toBe(5000); // after income
    expect(bars[1].runningTotal).toBe(3000); // after rent
    expect(bars[2].runningTotal).toBe(2000); // after food
    expect(bars[3].runningTotal).toBe(2000); // surplus
  });

  it("uncategorized expenses get 'Uncategorized' label", () => {
    const txs: TxRow[] = [
      makeTx({ amount: 1000, date: "2026-01-05" }),
      makeTx({ amount: -200, date: "2026-01-10", category: null }),
    ];

    const bars = getWaterfallData(txs, "2026-01");
    expect(bars[1].name).toBe("Uncategorized");
  });
});
