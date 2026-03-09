import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Anthropic from "@anthropic-ai/sdk";

const CATEGORIES = [
  "Restaurants",
  "Groceries",
  "Transportation",
  "Travel",
  "Entertainment",
  "Shopping",
  "Health",
  "Utilities & Bills",
  "Transfers",
  "Banking & Fees",
  "Other",
] as const;

const SYSTEM_PROMPT = `You are a personal finance categorization assistant for Canadian consumers.
Assign a category to each transaction from ONLY this list:
${CATEGORIES.join(", ")}

Rules:
- Restaurants, cafes, food delivery → "Restaurants"
- Supermarkets, grocery stores → "Groceries"
- Gas stations, parking, transit, Uber, Lyft, auto → "Transportation"
- Hotels, airlines, car rental → "Travel"
- Movies, streaming services, sports, gaming → "Entertainment"
- Retail stores, online shopping (Amazon, etc.) → "Shopping"
- Pharmacies, clinics, dental, optical → "Health"
- Phone, internet, hydro, electricity, insurance → "Utilities & Bills"
- E-transfers, online banking transfers, wire transfers → "Transfers"
- Bank service charges, NSF fees, ATM fees → "Banking & Fees"
- Anything else → "Other"

Return ONLY a raw JSON array. No markdown, no code fences. Format:
[{"id": "uuid-here", "category": "Restaurants"}, ...]`;

export async function POST(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch transactions with null categories for this user
  const { data: txRows, error: fetchError } = await supabaseAdmin
    .from("transactions")
    .select("id, merchant_raw, merchant_clean")
    .eq("user_id", user.id)
    .is("category", null);

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to fetch transactions: ${fetchError.message}` },
      { status: 500 }
    );
  }

  if (!txRows || txRows.length === 0) {
    return NextResponse.json({ count: 0, message: "All transactions already have categories" });
  }

  // Build a compact list for Claude
  const items = txRows.map((t) => ({
    id: t.id as string,
    merchant_raw: t.merchant_raw as string,
    merchant_clean: (t.merchant_clean ?? t.merchant_raw) as string,
  }));

  const client = new Anthropic();

  let parsed: { id: string; category: string }[];
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Categorize these ${items.length} transactions:\n${JSON.stringify(items)}`,
        },
      ],
    });

    const firstContent = message.content[0];
    if (firstContent.type !== "text") {
      throw new Error("Claude returned a non-text response");
    }

    let jsonText = firstContent.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const raw = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(raw)) throw new Error("Expected JSON array");

    parsed = (raw as { id: string; category: string }[]).filter(
      (r) =>
        typeof r.id === "string" &&
        typeof r.category === "string" &&
        (CATEGORIES as readonly string[]).includes(r.category)
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: `Categorization failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }

  if (parsed.length === 0) {
    return NextResponse.json({ count: 0, message: "No valid categories returned" });
  }

  // Update each transaction individually (Supabase JS doesn't support bulk update by id list with different values)
  let updatedCount = 0;
  for (const item of parsed) {
    const { error } = await supabaseAdmin
      .from("transactions")
      .update({ category: item.category })
      .eq("id", item.id)
      .eq("user_id", user.id); // safety: ensure user owns it
    if (!error) updatedCount++;
  }

  return NextResponse.json({ count: updatedCount, total: txRows.length });
}
