import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assembleFinancialSnapshot, FinancialSnapshot } from "@/lib/askMonvo";
import Anthropic from "@anthropic-ai/sdk";

const RATE_LIMIT = 10;

function buildSystemPrompt(snap: FinancialSnapshot): string {
  return `You are Monvo's financial decision assistant. You have access to the user's real financial data. Your job is to answer their question about an upcoming expense or financial decision with a specific, personalized, honest response.

USER FINANCIAL SNAPSHOT:
- Monthly net income: $${snap.monthlyNetIncome.toLocaleString("en-CA")}
- Monthly fixed costs: $${snap.monthlyFixedCosts.toLocaleString("en-CA")}
- Monthly discretionary spend (top categories): ${snap.discretionaryBreakdown.map((d) => `${d.category} $${d.monthlyAvg}/mo`).join(", ") || "insufficient data"}
- Active subscriptions: ${snap.subscriptions.map((s) => `${s.merchant} $${s.monthlyAmount}/mo`).join(", ") || "none detected"}
- Monthly surplus: $${snap.monthlySurplus.toLocaleString("en-CA")}
- Savings rate: ${snap.savingsRate}%
- Approximate liquid balance: $${snap.liquidBalanceProxy.toLocaleString("en-CA")} (approximate — derived from transaction history)
- Outstanding debt: not directly available from statements
- Emergency fund coverage: ${snap.emergencyFundMonths} months${snap.dataQuality === "limited" ? "\n\nDATA NOTE: User has fewer than 2 months of statement history. Note this limitation in your response." : ""}

RESPONSE RULES:
1. Always use the user's actual numbers. Never give generic advice.
2. Structure your response in EXACTLY these four labeled sections — use these exact labels as headers:
   VERDICT: [your verdict here]
   IMPACT: [your impact analysis here]
   BEST PATH: [your recommendation here]
   WATCH OUT FOR: [your risk/constraint here]
3. VERDICT must start with: FEASIBLE, FEASIBLE WITH ADJUSTMENTS, or NOT FEASIBLE.
4. Dollar amounts must be specific. Do not use ranges unless the input is ambiguous.
5. Where relevant, name specific Canadian financial products (EQ Bank, Amex Cobalt, CIBC Aventura, Wealthsimple, TFSA, RRSP, etc).
6. Total response must be 120-200 words. Be precise, not comprehensive.
7. Never say "I recommend consulting a financial advisor." You are the tool they are using.
8. If data is missing or insufficient, say what you cannot calculate and why — do not guess.`;
}

function parseResponse(text: string): {
  verdict: string;
  impact: string;
  bestPath: string;
  watchOut: string;
} | null {
  const verdictMatch = text.match(/VERDICT:\s*([\s\S]*?)(?=IMPACT:|$)/i);
  const impactMatch = text.match(/IMPACT:\s*([\s\S]*?)(?=BEST PATH:|$)/i);
  const bestPathMatch = text.match(/BEST PATH:\s*([\s\S]*?)(?=WATCH OUT FOR:|$)/i);
  const watchOutMatch = text.match(/WATCH OUT FOR:\s*([\s\S]*?)$/i);

  if (!verdictMatch || !impactMatch || !bestPathMatch || !watchOutMatch) return null;

  return {
    verdict: verdictMatch[1].trim(),
    impact: impactMatch[1].trim(),
    bestPath: bestPathMatch[1].trim(),
    watchOut: watchOutMatch[1].trim(),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate input
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "Query must be 500 characters or less" }, { status: 400 });
  }

  // Rate limit: count queries in last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ask_monvo_queries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      {
        error: "rate_limit_exceeded",
        message: "You've used your 10 questions for today. Come back tomorrow.",
      },
      { status: 429 }
    );
  }

  // Assemble snapshot
  const snapshot = await assembleFinancialSnapshot(supabase, user.id);

  // Call Claude
  const client = new Anthropic();
  let rawResponse: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(snapshot),
      messages: [{ role: "user", content: query }],
    });
    const first = message.content[0];
    if (first.type !== "text") throw new Error("Non-text response from Claude");
    rawResponse = first.text;
  } catch {
    return NextResponse.json(
      { error: "Could not generate a response. Try again." },
      { status: 500 }
    );
  }

  // Parse response
  const parsed = parseResponse(rawResponse);
  if (!parsed) {
    return NextResponse.json(
      { error: "Could not generate a response. Try again." },
      { status: 500 }
    );
  }

  // Store in DB
  await supabaseAdmin.from("ask_monvo_queries").insert({
    user_id: user.id,
    query_text: query,
    financial_snapshot: snapshot,
    response_verdict: parsed.verdict,
    response_impact: parsed.impact,
    response_path: parsed.bestPath,
    response_watchout: parsed.watchOut,
  });

  return NextResponse.json({
    verdict: parsed.verdict,
    impact: parsed.impact,
    best_path: parsed.bestPath,
    watch_out_for: parsed.watchOut,
    snapshot_used: snapshot,
    data_quality: snapshot.dataQuality,
  });
}
