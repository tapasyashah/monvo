"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SubscriptionRow from "./SubscriptionRow";
import type { SubscriptionRowData } from "./SubscriptionRow";

type FilterTab = "all" | "confirmed" | "review" | "business";

interface Props {
  subscriptions: SubscriptionRowData[];
  totalPersonalMonthly: number;
  totalBusinessMonthly: number;
}

export default function SubscriptionsPanel({
  subscriptions: initial,
  totalPersonalMonthly,
  totalBusinessMonthly,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [subs, setSubs] = useState(initial);

  const reviewCount = subs.filter(
    (s) => s.status === "unconfirmed" || s.status === "flagged"
  ).length;

  const filtered = subs.filter((s) => {
    if (s.status === "dismissed") return false;
    switch (activeTab) {
      case "confirmed":
        return s.status === "confirmed";
      case "review":
        return s.status === "unconfirmed" || s.status === "flagged";
      case "business":
        return s.expenseContext.startsWith("business_");
      default:
        return true;
    }
  });

  const handleAction = async (
    merchant: string,
    action: "confirm" | "dismiss"
  ) => {
    const res = await fetch("/api/subscriptions/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, action }),
    });
    if (res.ok) {
      // Optimistically update local state
      setSubs((prev) =>
        prev.map((s) =>
          s.merchant === merchant
            ? {
                ...s,
                status:
                  action === "confirm"
                    ? ("confirmed" as const)
                    : ("dismissed" as const),
              }
            : s
        )
      );
      router.refresh();
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "confirmed", label: "Confirmed" },
    { key: "review", label: "Needs Review" },
    { key: "business", label: "Business" },
  ];

  const totalMonthly = totalPersonalMonthly + totalBusinessMonthly;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Subscriptions & Recurring
        </h2>
        {totalMonthly > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
              ${totalMonthly.toFixed(2)}/mo
            </span>
          </div>
        )}
      </div>

      {/* Review banner */}
      {reviewCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
          <p className="text-xs font-medium text-amber-400">
            {reviewCount} subscription{reviewCount !== 1 ? "s" : ""} need
            {reviewCount === 1 ? "s" : ""} review
          </p>
        </div>
      )}

      {/* Totals split */}
      {(totalPersonalMonthly > 0 || totalBusinessMonthly > 0) && (
        <div className="mb-4 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span>
            Personal:{" "}
            <span className="font-medium text-[var(--foreground)]">
              ${totalPersonalMonthly.toFixed(2)}/mo
            </span>
          </span>
          {totalBusinessMonthly > 0 && (
            <span>
              Business:{" "}
              <span className="font-medium text-amber-400">
                ${totalBusinessMonthly.toFixed(2)}/mo
              </span>
            </span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-[var(--muted)]/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
            {tab.key === "review" && reviewCount > 0 && (
              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] text-amber-400">
                {reviewCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          {activeTab === "all"
            ? "No recurring subscriptions detected yet."
            : `No ${activeTab === "review" ? "items needing review" : activeTab + " subscriptions"}.`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="pb-2 pr-4 font-medium">Merchant</th>
                <th className="pb-2 pr-4 font-medium">Category</th>
                <th className="pb-2 pr-4 text-right font-medium">Monthly</th>
                <th className="pb-2 pr-4 text-right font-medium">
                  Annual Est.
                </th>
                <th className="pb-2 pr-2 font-medium">Status</th>
                <th className="pb-2 w-0 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <SubscriptionRow
                  key={sub.merchant}
                  subscription={sub}
                  onConfirm={(m) => handleAction(m, "confirm")}
                  onDismiss={(m) => handleAction(m, "dismiss")}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
