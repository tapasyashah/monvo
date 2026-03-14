"use client";

import { useSpendingView } from "@/contexts/SpendingViewContext";
import type { SpendingView } from "@/hooks/useTransactionFilter";
import { cn } from "@/lib/utils";

const SEGMENTS: { value: SpendingView; label: string }[] = [
  { value: "personal_only", label: "Personal" },
  { value: "business_only", label: "Business" },
  { value: "all", label: "All" },
];

export default function SpendingViewToggle() {
  const { view, setView } = useSpendingView();

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-0.5">
      {SEGMENTS.map((segment) => (
        <button
          key={segment.value}
          type="button"
          onClick={() => setView(segment.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-all duration-200",
            view === segment.value
              ? "bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/20"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
