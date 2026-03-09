"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Rec = {
  id: string;
  type: "hisa" | "subscription" | "credit_card" | "debt";
  title: string;
  body: string;
  estimated_impact: number | null;
  trigger_pattern: string | null;
};

const TYPE_CONFIG = {
  hisa: { label: "HISA", color: "bg-emerald-500/20 text-emerald-300" },
  subscription: { label: "Subscription", color: "bg-yellow-500/20 text-yellow-300" },
  credit_card: { label: "Credit Card", color: "bg-violet-500/20 text-violet-300" },
  debt: { label: "Spending Alert", color: "bg-red-500/20 text-red-300" },
};

export default function RecommendationCard({ rec }: { rec: Rec }) {
  const router = useRouter();
  const [acting, setActing] = useState<"dismiss" | "done" | null>(null);

  async function handleAction(field: "dismissed" | "actioned") {
    const kind = field === "dismissed" ? "dismiss" : "done";
    setActing(kind);
    try {
      await fetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: true }),
      });
      router.refresh();
    } catch {
      setActing(null);
    }
  }

  const cfg = TYPE_CONFIG[rec.type];

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
            {cfg.label}
          </span>
          <h3 className="text-base font-semibold text-neutral-50">{rec.title}</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">{rec.body}</p>
        </div>
        {rec.estimated_impact !== null && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Est. Impact</p>
            <p className="text-lg font-semibold text-emerald-400">
              ${Math.abs(rec.estimated_impact).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handleAction("actioned")}
          disabled={acting !== null}
          className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-600 disabled:opacity-50"
        >
          {acting === "done" ? "Saving…" : "Done"}
        </button>
        <button
          onClick={() => handleAction("dismissed")}
          disabled={acting !== null}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-300 disabled:opacity-50"
        >
          {acting === "dismiss" ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
