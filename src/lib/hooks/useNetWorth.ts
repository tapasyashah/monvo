/**
 * P2-D: useNetWorth hook — fetches user assets and YTD investment contributions.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export interface UserAsset {
  id: string;
  asset_type: string;
  institution: string;
  account_label: string | null;
  current_value: number;
  last_updated: string | null;
  notes: string | null;
}

export interface NetWorthData {
  assets: UserAsset[];
  totalValue: number;
  ytdContributions: number;
  lastUpdated: string | null;
}

export function useNetWorth() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetWorth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      // Fetch assets
      const { data: assets, error: assetsErr } = await supabase
        .from("user_assets")
        .select("id, asset_type, institution, account_label, current_value, last_updated, notes")
        .order("current_value", { ascending: false });

      if (assetsErr) throw assetsErr;

      // Fetch YTD investment contributions from transactions
      const yearStart = new Date().getFullYear() + "-01-01";
      const { data: contribs, error: contribErr } = await supabase
        .from("transactions")
        .select("amount")
        .eq("transfer_type", "investment_contribution")
        .gte("date", yearStart);

      if (contribErr) throw contribErr;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedAssets: UserAsset[] = ((assets ?? []) as any[]).map((a: any) => ({
        id: a.id,
        asset_type: a.asset_type ?? "other",
        institution: a.institution ?? "Unknown",
        account_label: a.account_label,
        current_value: Number(a.current_value) || 0,
        last_updated: a.last_updated,
        notes: a.notes,
      }));

      const totalValue = typedAssets.reduce((sum, a) => sum + a.current_value, 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ytdContributions = ((contribs ?? []) as any[]).reduce(
        (sum: number, c: any) => sum + Math.abs(Number(c.amount)),
        0,
      );

      const mostRecent = typedAssets
        .map((a) => a.last_updated)
        .filter(Boolean)
        .sort()
        .pop() ?? null;

      setData({ assets: typedAssets, totalValue, ytdContributions, lastUpdated: mostRecent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load net worth");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetWorth();
  }, [fetchNetWorth]);

  return { data, isLoading, error, refetch: fetchNetWorth };
}
