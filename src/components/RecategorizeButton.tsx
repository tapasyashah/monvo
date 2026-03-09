"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tag, Loader2 } from "lucide-react";

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
    <Alert className="border-amber-500/30 bg-amber-500/10">
      <Tag className="size-4 text-amber-400" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div>
          <span className="font-medium text-amber-300">
            {uncategorizedCount} transaction{uncategorizedCount !== 1 ? "s" : ""} need categorizing
          </span>
          <span className="ml-2 text-xs text-amber-400/70">
            These were imported before auto-categorization was enabled.
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleCategorize}
          disabled={loading}
          className="shrink-0 bg-amber-600 text-white hover:bg-amber-500"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Categorizing…
            </>
          ) : (
            "Fix Categories"
          )}
        </Button>
      </AlertDescription>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </Alert>
  );
}
