import React from "react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import GenerateRecommendationsButton from "@/components/GenerateRecommendationsButton";
import RecommendationCard from "@/components/RecommendationCard";

type RecommendationRow = {
  id: string;
  type: "hisa" | "subscription" | "credit_card" | "debt";
  title: string;
  body: string;
  estimated_impact: number | null;
  trigger_pattern: string | null;
  generated_at: string;
};

export default async function RecommendationsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // user is guaranteed non-null by dashboard/layout.tsx

  const { data } = await supabase
    .from("recommendations")
    .select("id, type, title, body, estimated_impact, trigger_pattern, generated_at")
    .eq("user_id", user!.id)
    .eq("dismissed", false)
    .eq("actioned", false)
    .order("generated_at", { ascending: false });

  const recs = (data ?? []) as RecommendationRow[];

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">Recommendations</h1>
            <p className="text-sm text-neutral-400">AI-generated insights based on your spending</p>
          </div>
          <GenerateRecommendationsButton />
        </header>

        {recs.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-8 py-16 text-center">
            <p className="text-sm font-medium text-neutral-300">No recommendations yet</p>
            <p className="mt-1 text-sm text-neutral-500">Click &quot;Generate Recommendations&quot; to analyse your spending.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
