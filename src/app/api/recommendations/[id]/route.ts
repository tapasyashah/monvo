import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Auth: use getSession() (local cookie read) to avoid network timeout
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json() as Record<string, unknown>;
  const { dismissed, actioned } = body;

  // Build update object — only include fields that are boolean in the body
  const updateObj: Record<string, boolean> = {};
  if (typeof dismissed === 'boolean') {
    updateObj.dismissed = dismissed;
  }
  if (typeof actioned === 'boolean') {
    updateObj.actioned = actioned;
  }

  if (Object.keys(updateObj).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Verify ownership
  const { data } = await supabaseAdmin
    .from("recommendations")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!data || data.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Perform update
  await supabaseAdmin
    .from("recommendations")
    .update(updateObj)
    .eq("id", id);

  return NextResponse.json({ updated: true });
}
