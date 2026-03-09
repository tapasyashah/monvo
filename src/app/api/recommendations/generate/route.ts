import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildTransactionSummary, generateRecommendations } from "@/lib/recommendations";

export async function POST(): Promise<NextResponse> {
  // Auth: use getSession() (local cookie read) to avoid network timeout
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch transactions
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("date, merchant_clean, category, amount, account_type, is_recurring")
    .eq("user_id", user.id);

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  const txRows = transactions ?? [];

  if (txRows.length < 5) {
    return NextResponse.json(
      { message: "Not enough data to generate recommendations" },
      { status: 200 }
    );
  }

  try {
    const summary = buildTransactionSummary(txRows);
    const rows = await generateRecommendations(summary);

    // Delete old recommendations for this user
    await supabaseAdmin
      .from("recommendations")
      .delete()
      .eq("user_id", user.id);

    // Insert new recommendations
    const { error: insertError } = await supabaseAdmin
      .from("recommendations")
      .insert(rows.map((r) => ({ ...r, user_id: user.id })));

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ count: rows.length, recommendations: rows }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
