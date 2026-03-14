"use client";

import type { ExpenseContext } from "@/lib/classifiers/business-tagger";
import { Check, X } from "lucide-react";

interface ExpenseContextBadgeProps {
  context: ExpenseContext;
  confirmed: boolean;
  onConfirm?: () => void;
  onDeny?: () => void;
}

const BADGE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string } | null
> = {
  personal: null,
  business_bare_thoughts: {
    label: "BT",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  business_finnav: {
    label: "FN",
    bg: "bg-[#00D2A0]/15",
    text: "text-[#00D2A0]",
    border: "border-[#00D2A0]/30",
  },
  business_factory: {
    label: "FS",
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  business_other: {
    label: "BIZ",
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  investment: {
    label: "INV",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  transfer: {
    label: "TFR",
    bg: "bg-slate-500/15",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
};

export default function ExpenseContextBadge({
  context,
  confirmed,
  onConfirm,
  onDeny,
}: ExpenseContextBadgeProps) {
  const config = BADGE_CONFIG[context];

  // No badge for personal expenses
  if (!config) return null;

  const isUnconfirmedBusiness =
    !confirmed && context.startsWith("business_");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
      {isUnconfirmedBusiness && (
        <>
          <span className="opacity-60">?</span>
          {onConfirm && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfirm();
              }}
              className="ml-0.5 rounded p-0.5 transition-colors hover:bg-white/10"
              aria-label="Confirm business expense"
            >
              <Check className="size-2.5" />
            </button>
          )}
          {onDeny && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeny();
              }}
              className="rounded p-0.5 transition-colors hover:bg-white/10"
              aria-label="Mark as personal"
            >
              <X className="size-2.5" />
            </button>
          )}
        </>
      )}
    </span>
  );
}
