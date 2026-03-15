import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assembleFinancialSnapshot, FinancialSnapshot } from "@/lib/askMonvo";
import { buildUserContext, formatContextForPrompt } from "@/lib/ask-monvo/context-builder";
import { tryQuestionTemplate } from "@/lib/ask-monvo/question-templates";
import Anthropic from "@anthropic-ai/sdk";

const RATE_LIMIT = 10;

type ProfileSummary = {
  outstandingDebt: number;
  monthlyLoanPayment: number;
  creditCards: string[];
  registeredAccounts: string[];
  gicRates: string[];
  monthlyInvestmentContribution: number;
};

function buildProfileSummary(profile: {
  banks?: Array<{ account_types?: string[]; card_name?: string }>;
  loans?: Array<{ balance: number; monthly_payment: number }>;
  registered_accounts?: Array<{ type: string; balance: number; interest_rate?: number }>;
  investments?: Array<{ monthly_contribution: number }>;
} | null): ProfileSummary | null {
  if (!profile) return null;
  const outstandingDebt = (profile.loans ?? []).reduce((s, l) => s + l.balance, 0);
  const monthlyLoanPayment = (profile.loans ?? []).reduce((s, l) => s + l.monthly_payment, 0);
  const creditCards = (profile.banks ?? [])
    .filter((b) => b.account_types?.includes("Credit Card") && b.card_name)
    .map((b) => b.card_name!);
  const registeredAccounts = (profile.registered_accounts ?? []).map(
    (a) => `${a.type}: $${a.balance.toLocaleString("en-CA")}`
  );
  const gicRates = (profile.registered_accounts ?? [])
    .filter((a) => a.type === "GIC" && a.interest_rate != null && a.interest_rate > 0)
    .map((a) => `${a.type} $${a.balance.toLocaleString("en-CA")} at ${a.interest_rate}%/year`);
  const monthlyInvestmentContribution = (profile.investments ?? []).reduce(
    (s, i) => s + i.monthly_contribution,
    0
  );
  return {
    outstandingDebt,
    monthlyLoanPayment,
    creditCards,
    registeredAccounts,
    gicRates,
    monthlyInvestmentContribution,
  };
}

function buildSystemPrompt(
  snap: FinancialSnapshot,
  profileSummary: ProfileSummary | null
): string {
  const debtLine = profileSummary
    ? `- Outstanding debt: $${profileSummary.outstandingDebt.toLocaleString("en-CA")} (monthly payment $${profileSummary.monthlyLoanPayment.toLocaleString("en-CA")})`
    : "- Outstanding debt: not directly available from statements";
  const profileBlock = profileSummary
    ? `
USER PROFILE (from their accounts, loans, investments):
- Credit cards held: ${profileSummary.creditCards.length ? profileSummary.creditCards.join(", ") : "none listed"}
- Registered accounts: ${profileSummary.registeredAccounts.length ? profileSummary.registeredAccounts.join("; ") : "none listed"}
- GIC rates (if any): ${profileSummary.gicRates.length ? profileSummary.gicRates.join("; ") : "none"}
- Monthly investment contribution: $${profileSummary.monthlyInvestmentContribution.toLocaleString("en-CA")}`
    : "";

  return `You are Monvo's financial decision assistant. You have access to the user's real financial data. Your job is to answer their question about an upcoming expense or financial decision with a specific, personalized, honest response.

USER FINANCIAL SNAPSHOT:
- Monthly net income: $${snap.monthlyNetIncome.toLocaleString("en-CA")}
- Monthly fixed costs: $${snap.monthlyFixedCosts.toLocaleString("en-CA")}
- Monthly discretionary spend (top categories): ${snap.discretionaryBreakdown.map((d) => `${d.category} $${d.monthlyAvg}/mo`).join(", ") || "insufficient data"}
- Active subscriptions: ${snap.subscriptions.map((s) => `${s.merchant} $${s.monthlyAmount}/mo`).join(", ") || "none detected"}
- Monthly surplus: $${snap.monthlySurplus.toLocaleString("en-CA")}
- Savings rate: ${snap.savingsRate}%
- Approximate liquid balance: $${snap.liquidBalanceProxy.toLocaleString("en-CA")} (approximate — derived from transaction history)
${debtLine}
- Emergency fund coverage: ${snap.emergencyFundMonths} months${profileBlock}${snap.dataQuality === "limited" ? "\n\nDATA NOTE: User has fewer than 2 months of statement history. Note this limitation in your response." : ""}

Use the profile data above (debt, cards, registered accounts, GIC rates, investment contribution) when relevant to the user's question.

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
  let body: {
    query?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };
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
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

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

  // Check question templates first (bypass LLM for speed)
  const templateResult = await tryQuestionTemplate(supabase, query);
  if (templateResult.matched) {
    // Store in DB even for template matches
    await supabaseAdmin.from("ask_monvo_queries").insert({
      user_id: user.id,
      query_text: query,
      financial_snapshot: null,
      response_verdict: "DIRECT_ANSWER",
      response_impact: templateResult.answer,
      response_path: null,
      response_watchout: null,
    });

    return NextResponse.json({
      verdict: templateResult.answer,
      impact: "",
      best_path: "",
      watch_out_for: "",
      data_quality: "good",
      direct_answer: true,
    });
  }

  // Fetch profile (recurring overrides + full profile for Ask Monvo context)
  const [{ data: profileRow }, userContext] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("banks, loans, registered_accounts, investments, recurring_overrides")
      .eq("user_id", user.id)
      .single(),
    buildUserContext(supabase),
  ]);
  const recurringOverrides = (profileRow?.recurring_overrides ?? {}) as Record<string, boolean>;
  const profileSummary = buildProfileSummary(profileRow);

  const snapshot = await assembleFinancialSnapshot(supabase, user.id, { recurringOverrides });

  // Build context-enriched system prompt
  const contextBlock = formatContextForPrompt(userContext);
  const systemPrompt = buildSystemPrompt(snapshot, profileSummary) + "\n\n" + contextBlock;

  // Build conversation messages with history
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: "user", content: query });

  // Call Claude
  const client = new Anthropic();
  let rawResponse: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
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
