"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecategorizeButton({ uncategorizedCount }: { uncategorizedCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCategorize() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recategorize", { method: "POST" });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Categorization failed");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <div className="rounded-2xl border border-amber-800/50 bg-amber-950/30 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-200">
            {uncategorizedCount} transaction{uncategorizedCount !== 1 ? "s" : ""} need categorizing
          </p>
          <p className="mt-0.5 text-xs text-amber-400/70">
            These were imported before auto-categorization was enabled. Click to fix them now.
          </p>
        </div>
        <button
          onClick={handleCategorize}
          disabled={loading}
          className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Categorizing…" : "Fix Categories"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
