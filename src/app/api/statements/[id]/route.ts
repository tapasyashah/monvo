import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  // Auth: use getSession() (local cookie read) to avoid network timeout
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership via admin client (bypasses RLS)
  const { data: stmt } = await supabaseAdmin
    .from("statements")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!stmt || stmt.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete transactions first (FK constraint)
  await supabaseAdmin.from("transactions").delete().eq("statement_id", id);

  // Delete storage file
  await supabaseAdmin.storage
    .from("statements")
    .remove([`${user.id}/${id}.pdf`]);

  // Delete the statement record
  await supabaseAdmin.from("statements").delete().eq("id", id);

  return NextResponse.json({ deleted: true });
}
