import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * PATCH: Update a single recurring override for the current user.
 * Body: { merchant: string, value: boolean }
 * - value true = show as recurring; value false = hide from recurring list.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { merchant?: string; value?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const merchant = typeof body.merchant === "string" ? body.merchant.trim() : "";
  const value = typeof body.value === "boolean" ? body.value : undefined;
  if (!merchant || value === undefined) {
    return NextResponse.json(
      { error: "Body must include merchant (string) and value (boolean)" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("user_profiles")
    .select("banks, loans, registered_accounts, investments, recurring_overrides")
    .eq("user_id", session.user.id)
    .single();

  const currentOverrides = (existing?.recurring_overrides ?? {}) as Record<string, boolean>;
  const nextOverrides = { ...currentOverrides, [merchant]: value };

  const { error } = await supabaseAdmin.from("user_profiles").upsert(
    {
      user_id: session.user.id,
      banks: existing?.banks ?? [],
      loans: existing?.loans ?? [],
      registered_accounts: existing?.registered_accounts ?? [],
      investments: existing?.investments ?? [],
      recurring_overrides: nextOverrides,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, recurring_overrides: nextOverrides });
}
