import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST: Confirm or dismiss a subscription entry.
 * Body: { merchant: string, action: 'confirm' | 'dismiss' }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { merchant?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const merchant =
    typeof body.merchant === "string" ? body.merchant.trim() : "";
  const action = body.action;

  if (!merchant || (action !== "confirm" && action !== "dismiss")) {
    return NextResponse.json(
      {
        error:
          'Body must include merchant (string) and action ("confirm" | "dismiss")',
      },
      { status: 400 }
    );
  }

  const newStatus = action === "confirm" ? "confirmed" : "dismissed";
  const isActual = action === "confirm";

  // Upsert: create if not exists, update if exists
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: session.user.id,
        merchant_canonical: merchant,
        status: newStatus,
        is_actual_subscription: isActual,
      },
      { onConflict: "user_id,merchant_canonical" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, subscription: data });
}
