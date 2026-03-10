"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertTriangle } from "lucide-react";

interface AskMonvoResponse {
  verdict: string;
  impact: string;
  best_path: string;
  watch_out_for: string;
  data_quality: "good" | "limited";
}

const EXAMPLE_PROMPTS = [
  "I'm thinking about buying a car next year...",
  "What if I moved to a more expensive apartment?",
  "Should I pay off my credit card or invest the money?",
];

function VerdictBadge({ verdict }: { verdict: string }) {
  const upper = verdict.toUpperCase();
  let colorClass = "border-green-500/30 bg-green-500/10 text-green-400";
  if (upper.startsWith("FEASIBLE WITH ADJUSTMENTS")) {
    colorClass = "border-amber-500/30 bg-amber-500/10 text-amber-400";
  } else if (upper.startsWith("NOT FEASIBLE")) {
    colorClass = "border-red-500/30 bg-red-500/10 text-red-400";
  }
  const label = upper.startsWith("NOT FEASIBLE")
    ? "NOT FEASIBLE"
    : upper.startsWith("FEASIBLE WITH ADJUSTMENTS")
    ? "FEASIBLE WITH ADJUSTMENTS"
    : "FEASIBLE";
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${colorClass}`}>
      {label}
    </Badge>
  );
}

export default function AskMonvoCard() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskMonvoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  async function handleSubmit() {
    if (!query.trim() || loading || rateLimited) return;
    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      const res = await fetch("/api/ask-monvo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        setError("You've used your 10 questions for today. Come back tomorrow.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Could not generate a response. Try again.");
        return;
      }

      const data = await res.json() as AskMonvoResponse;
      setResponse(data);
    } catch {
      setError("Could not generate a response. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const remaining = 500 - query.length;

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="px-8 pt-8 pb-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <MessageSquare className="size-5 text-[var(--primary)]" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">
              Planning something? Ask Monvo.
            </CardTitle>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Describe an upcoming expense or decision. Monvo will tell you how it fits your finances.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-8 pb-8 pt-6 space-y-4">
        {/* Example prompt chips */}
        {!response && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setQuery(p.endsWith("...") ? p.slice(0, -3) : p)}
                className="rounded-full border border-[var(--border)] bg-[var(--secondary)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:border-[var(--primary)]/30 hover:text-[var(--foreground)] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="space-y-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading || rateLimited}
            rows={4}
            maxLength={500}
            placeholder="e.g. I want to take a trip to Europe in July, probably around $4,000 total."
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/50 focus:outline-none disabled:opacity-50 transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">
              {remaining} characters remaining
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || loading || rateLimited}
              size="sm"
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
            >
              {loading ? "Monvo is thinking…" : "Ask Monvo"}
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Response panel */}
        {response && (
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            {response.data_quality === "limited" && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                Upload at least 2 months of statements for a full analysis. Showing limited response.
              </div>
            )}

            {/* Verdict */}
            <div className="space-y-1.5">
              <VerdictBadge verdict={response.verdict} />
              <p className="text-sm text-[var(--foreground)] leading-relaxed">{response.verdict}</p>
            </div>

            {/* Impact */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Impact
              </p>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{response.impact}</p>
            </div>

            {/* Best Path */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Best Path
              </p>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{response.best_path}</p>
            </div>

            {/* Watch Out For */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                Watch Out For
              </p>
              <p className="text-sm text-amber-300/90 leading-relaxed">{response.watch_out_for}</p>
            </div>

            {/* Ask another */}
            <button
              onClick={() => { setResponse(null); setQuery(""); setError(null); }}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2 transition-colors"
            >
              Ask another question
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
