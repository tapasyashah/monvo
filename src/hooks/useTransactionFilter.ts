"use client";

import { useMemo } from "react";

export type SpendingView =
  | "personal_only"
  | "business_only"
  | "all"
  | "true_personal";

export interface TransactionFilter {
  /** The active view label */
  view: SpendingView;
  /** expense_context values to include (null = no filter on this column) */
  includeContexts: string[] | null;
  /** expense_context values to exclude (null = no exclusion) */
  excludeContexts: string[] | null;
}

/**
 * Returns a filter configuration for the given spending view.
 * The returned object describes which expense_context values to include/exclude
 * when querying transactions from Supabase.
 *
 * Usage with Supabase:
 *   const filter = useTransactionFilter(view);
 *   let query = supabase.from("transactions").select("*");
 *   if (filter.includeContexts) query = query.in("expense_context", filter.includeContexts);
 *   if (filter.excludeContexts) query = query.not("expense_context", "in", `(${filter.excludeContexts.join(",")})`);
 */
export function useTransactionFilter(view: SpendingView): TransactionFilter {
  return useMemo(() => {
    switch (view) {
      case "personal_only":
        return {
          view,
          includeContexts: ["personal"],
          excludeContexts: null,
        };

      case "business_only":
        return {
          view,
          includeContexts: [
            "business_bare_thoughts",
            "business_finnav",
            "business_factory",
            "business_other",
          ],
          excludeContexts: null,
        };

      case "true_personal":
        // Personal spending minus transfers and investments
        return {
          view,
          includeContexts: ["personal"],
          excludeContexts: ["transfer", "investment"],
        };

      case "all":
      default:
        return {
          view,
          includeContexts: null,
          excludeContexts: null,
        };
    }
  }, [view]);
}
