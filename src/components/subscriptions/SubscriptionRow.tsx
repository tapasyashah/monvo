"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ExpenseContextBadge from "@/components/transactions/ExpenseContextBadge";
import type { ExpenseContext } from "@/lib/classifiers/business-tagger";

export interface SubscriptionRowData {
  id?: string;
  merchant: string;
  category: string;
  confidenceScore: number;
  monthlyAmount: number;
  annualEstimate: number;
  occurrenceCount: number;
  expenseContext: string;
  status: "confirmed" | "unconfirmed" | "flagged" | "dismissed";
}

interface Props {
  subscription: SubscriptionRowData;
  onConfirm: (merchant: string) => Promise<void>;
  onDismiss: (merchant: string) => Promise<void>;
}

function statusBadge(status: string, confidence: number) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        Confirmed
      </span>
    );
  }
  if (status === "dismissed") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
        Dismissed
      </span>
    );
  }
  if (confidence >= 0.7) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
      Flagged
    </span>
  );
}

export default function SubscriptionRow({
  subscription,
  onConfirm,
  onDismiss,
}: Props) {
  const [loading, setLoading] = useState(false);
  const s = subscription;
  const isBusiness = s.expenseContext.startsWith("business_");

  const handleAction = async (action: "confirm" | "dismiss") => {
    setLoading(true);
    try {
      if (action === "confirm") await onConfirm(s.merchant);
      else await onDismiss(s.merchant);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b border-[var(--border)]/50 last:border-0">
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--foreground)]">
            {s.merchant}
          </span>
          {isBusiness && (
            <ExpenseContextBadge
              context={s.expenseContext as ExpenseContext}
              confirmed={true}
            />
          )}
        </div>
        {s.status === "unconfirmed" && (
          <p className="mt-0.5 text-[10px] text-amber-400/80">
            Is this a real subscription?
          </p>
        )}
      </td>
      <td className="py-2.5 pr-4 text-[var(--muted-foreground)]">
        {s.category}
      </td>
      <td className="py-2.5 pr-4 text-right text-[var(--foreground)]">
        ${s.monthlyAmount.toFixed(2)}
      </td>
      <td className="py-2.5 pr-4 text-right text-[var(--muted-foreground)]">
        ${s.annualEstimate.toFixed(2)}
      </td>
      <td className="py-2.5 pr-2">{statusBadge(s.status, s.confidenceScore)}</td>
      <td className="py-2.5 pl-2">
        {s.status !== "confirmed" && s.status !== "dismissed" && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              disabled={loading}
              onClick={() => handleAction("confirm")}
              title="Confirm subscription"
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10"
              disabled={loading}
              onClick={() => handleAction("dismiss")}
              title="Dismiss — not a subscription"
            >
              Dismiss
            </Button>
          </div>
        )}
        {s.status === "confirmed" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-[var(--muted-foreground)] hover:text-red-400"
            disabled={loading}
            onClick={() => handleAction("dismiss")}
          >
            Remove
          </Button>
        )}
        {s.status === "dismissed" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-[var(--muted-foreground)] hover:text-emerald-400"
            disabled={loading}
            onClick={() => handleAction("confirm")}
          >
            Restore
          </Button>
        )}
      </td>
    </tr>
  );
}
