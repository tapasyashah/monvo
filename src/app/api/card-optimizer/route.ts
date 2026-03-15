import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { optimizeCards } from "@/lib/cards/optimizer";

// TODO: Add 24hr caching per user (e.g. via Supabase or in-memory cache)

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch last 3 months of transactions
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const cutoff = threeMonthsAgo.toISOString().slice(0, 10);

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("date, category, amount")
    .eq("user_id", user.id)
    .gte("date", cutoff)
    .lt("amount", 0); // Only expenses (negative amounts)

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  const txRows = transactions ?? [];

  if (txRows.length < 5) {
    return NextResponse.json(
      { results: [], message: "Not enough transaction data" },
      { status: 200 }
    );
  }

  // Group spending by category, compute monthly average
  const categoryTotals = new Map<string, number>();
  const months = new Set<string>();

  for (const tx of txRows) {
    const category = tx.category ?? "Other";
    const spend = Math.abs(tx.amount);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + spend);
    months.add(tx.date.slice(0, 7));
  }

  const monthCount = Math.max(months.size, 1);
  const spendingByCategory: Record<string, number> = {};

  for (const [category, total] of categoryTotals) {
    // Skip income-like categories
    if (category === "Income" || category === "Investments") continue;
    spendingByCategory[category] = total / monthCount;
  }

  // For now, we don't track which cards the user holds — pass empty array.
  // Future: read from user_profiles or a dedicated user_cards table.
  const userCards: string[] = [];

  const results = optimizeCards(spendingByCategory, userCards);

  return NextResponse.json({ results }, { status: 200 });
}
