"use client";

import { useEffect, useRef } from "react";
import type { DrillDownTransaction } from "@/lib/queries/analytics";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DrillDownModalProps {
  open: boolean;
  category: string;
  total: number;
  transactions: DrillDownTransaction[];
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component — slide-up panel
// ---------------------------------------------------------------------------

export default function DrillDownModal({
  open,
  category,
  total,
  transactions,
  onClose,
}: DrillDownModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on click outside panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing immediately from the click that opened it
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const displayName =
    category === "__income__" ? "Income" : category;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="w-full max-w-2xl animate-in slide-in-from-bottom rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
        style={{ maxHeight: "70vh" }}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {displayName}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Total: $
              {total.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--border)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Transaction list */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 120px)" }}>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              No transactions found.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, i) => (
                <div
                  key={`${tx.date}-${tx.merchant}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {tx.merchant}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">{tx.date}</p>
                  </div>
                  <span className="ml-4 shrink-0 text-sm font-semibold text-[var(--foreground)]">
                    ${tx.amount.toLocaleString("en-CA", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View all stub */}
        {transactions.length > 0 && (
          <div className="mt-4 border-t border-[var(--border)] pt-3 text-center">
            <button
              className="text-xs font-medium text-[var(--primary)] hover:underline"
              onClick={() => {
                /* TODO: navigate to full transaction list filtered by category */
              }}
            >
              View all transactions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
