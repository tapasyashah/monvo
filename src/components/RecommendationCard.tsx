"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

type Rec = {
  id: string;
  type: "hisa" | "subscription" | "credit_card" | "debt";
  title: string;
  body: string;
  estimated_impact: number | null;
  trigger_pattern: string | null;
};

const TYPE_CONFIG = {
  hisa: {
    label: "HISA",
    className: "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
  },
  subscription: {
    label: "Subscription",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  credit_card: {
    label: "Credit Card",
    className: "border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]",
  },
  debt: {
    label: "Spending Alert",
    className: "border-red-500/30 bg-red-500/10 text-red-400",
  },
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
    <Card className="border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[var(--primary)]/20">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Badge variant="outline" className={`text-xs ${cfg.className}`}>
              {cfg.label}
            </Badge>
            <h3 className="text-base font-semibold text-[var(--foreground)] leading-snug">
              {rec.title}
            </h3>
          </div>
          {rec.estimated_impact !== null && (
            <div className="shrink-0 text-right">
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                Est. Impact
              </p>
              <p
                className="text-xl font-bold text-[var(--accent)] tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ${Math.abs(rec.estimated_impact).toLocaleString("en-CA", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                <span className="text-xs font-normal text-[var(--muted-foreground)]">/yr</span>
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-3">
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{rec.body}</p>
      </CardContent>
      <CardFooter className="flex gap-2 px-5 pb-5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("actioned")}
          disabled={acting !== null}
          className="gap-1.5 border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--secondary)]/80"
        >
          <Check className="size-3.5" />
          {acting === "done" ? "Saving…" : "Done"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleAction("dismissed")}
          disabled={acting !== null}
          className="gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <X className="size-3.5" />
          {acting === "dismiss" ? "Dismissing…" : "Dismiss"}
        </Button>
      </CardFooter>
    </Card>
  );
}
