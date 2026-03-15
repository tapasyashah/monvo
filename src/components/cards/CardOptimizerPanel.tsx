"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import type { OptimizationResult } from "@/lib/cards/optimizer";

export default function CardOptimizerPanel() {
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOptimization() {
      try {
        const res = await fetch("/api/card-optimizer");
        if (!res.ok) {
          const body = await res.json();
          setError(body.error ?? "Failed to load card optimization");
          return;
        }
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setError("Unable to reach card optimizer");
      } finally {
        setLoading(false);
      }
    }
    fetchOptimization();
  }, []);

  if (loading) {
    return (
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-[var(--muted-foreground)]" />
          <span className="ml-3 text-sm text-[var(--muted-foreground)]">
            Analyzing your spending patterns...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <CreditCard className="size-5 text-[var(--primary)]" />
            </div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">
              Credit Card Optimizer
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-4 text-sm text-[var(--muted-foreground)]">
          Upload at least 3 months of statements to see card recommendations.
        </CardContent>
      </Card>
    );
  }

  const totalAnnualGain = results.reduce((sum, r) => sum + r.annual_gain, 0);
  const totalAnnualValue = results.reduce(
    (sum, r) => sum + r.potential_rewards_value * 12,
    0
  );

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="px-8 pt-8 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <CreditCard className="size-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                Credit Card Optimizer
              </CardTitle>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                Best Canadian cards for your spending patterns
              </p>
            </div>
          </div>
          {totalAnnualGain > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5">
              <TrendingUp className="size-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">
                +${totalAnnualGain.toFixed(0)}/yr potential
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-8 pb-8 pt-6">
        <div className="space-y-3">
          {results.map((result) => {
            const isOptimal = result.monthly_gain <= 0;
            return (
              <div
                key={result.category}
                className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {result.category}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      ${result.monthly_spend.toFixed(0)}/mo
                    </span>
                    {isOptimal && (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {result.reasoning}
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:text-right">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Best card
                    </p>
                    <p className="text-sm font-medium text-[var(--primary)]">
                      {result.recommended_card}
                    </p>
                  </div>
                  {!isOptimal && (
                    <div className="rounded-md bg-emerald-500/10 px-2 py-1">
                      <p className="text-xs font-semibold text-emerald-400">
                        +${result.annual_gain.toFixed(0)}/yr
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total annual rewards value */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Total annual rewards value (optimized)
          </span>
          <span className="text-lg font-bold text-[var(--primary)]">
            ${totalAnnualValue.toFixed(0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
