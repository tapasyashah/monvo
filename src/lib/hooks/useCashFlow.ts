"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { SpendingView } from "@/hooks/useTransactionFilter";

export interface CashFlowMonth {
  month: string; // ISO date string e.g. "2026-03-01"
  total_income: number;
  true_spending: number;
  business_spending: number;
  investment_contributions: number;
  transfer_total: number;
  surplus_deficit: number;
  savings_rate: number;
}

export interface CashFlowTrend {
  spendingDelta: number;
  spendingDeltaPercent: number;
  incomeDelta: number;
  incomeDeltaPercent: number;
  direction: "up" | "down" | "flat";
}

export interface CashFlowResult {
  data: CashFlowMonth[];
  isLoading: boolean;
  error: string | null;
  currentMonth: CashFlowMonth | null;
  previousMonth: CashFlowMonth | null;
  threeMonthAvg: CashFlowMonth | null;
  trend: CashFlowTrend | null;
}

function computeTrend(
  current: CashFlowMonth | null,
  previous: CashFlowMonth | null
): CashFlowTrend | null {
  if (!current || !previous) return null;

  const spendingDelta = current.true_spending - previous.true_spending;
  const spendingDeltaPercent =
    previous.true_spending > 0
      ? (spendingDelta / previous.true_spending) * 100
      : 0;

  const incomeDelta = current.total_income - previous.total_income;
  const incomeDeltaPercent =
    previous.total_income > 0
      ? (incomeDelta / previous.total_income) * 100
      : 0;

  const direction: "up" | "down" | "flat" =
    Math.abs(spendingDeltaPercent) < 1
      ? "flat"
      : spendingDelta > 0
        ? "up"
        : "down";

  return {
    spendingDelta,
    spendingDeltaPercent,
    incomeDelta,
    incomeDeltaPercent,
    direction,
  };
}

function computeAverage(months: CashFlowMonth[]): CashFlowMonth | null {
  if (months.length === 0) return null;
  const n = months.length;
  const avg: CashFlowMonth = {
    month: "avg",
    total_income: months.reduce((s, m) => s + m.total_income, 0) / n,
    true_spending: months.reduce((s, m) => s + m.true_spending, 0) / n,
    business_spending: months.reduce((s, m) => s + m.business_spending, 0) / n,
    investment_contributions:
      months.reduce((s, m) => s + m.investment_contributions, 0) / n,
    transfer_total: months.reduce((s, m) => s + m.transfer_total, 0) / n,
    surplus_deficit: months.reduce((s, m) => s + m.surplus_deficit, 0) / n,
    savings_rate: months.reduce((s, m) => s + m.savings_rate, 0) / n,
  };
  return avg;
}

export function useCashFlow(
  months: number = 3,
  view: SpendingView = "personal_only"
): CashFlowResult {
  const [data, setData] = useState<CashFlowMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCashFlow() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Not authenticated");
          setIsLoading(false);
          return;
        }

        const { data: rows, error: rpcError } = await supabase.rpc(
          "get_cash_flow_summary",
          {
            p_user_id: user.id,
            p_months: months,
            p_view: view,
          }
        );

        if (cancelled) return;

        if (rpcError) {
          setError(rpcError.message);
          setData([]);
        } else {
          const parsed: CashFlowMonth[] = (rows ?? []).map(
            (r: Record<string, unknown>) => ({
              month: String(r.month),
              total_income: Number(r.total_income),
              true_spending: Number(r.true_spending),
              business_spending: Number(r.business_spending),
              investment_contributions: Number(r.investment_contributions),
              transfer_total: Number(r.transfer_total),
              surplus_deficit: Number(r.surplus_deficit),
              savings_rate: Number(r.savings_rate),
            })
          );
          setData(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchCashFlow();
    return () => {
      cancelled = true;
    };
  }, [months, view]);

  const currentMonth = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  const previousMonth = useMemo(() => {
    if (data.length < 2) return null;
    return data[data.length - 2];
  }, [data]);

  const threeMonthAvg = useMemo(() => computeAverage(data), [data]);

  const trend = useMemo(
    () => computeTrend(currentMonth, previousMonth),
    [currentMonth, previousMonth]
  );

  return { data, isLoading, error, currentMonth, previousMonth, threeMonthAvg, trend };
}
