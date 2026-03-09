"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteStatementButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this statement and all its transactions? This cannot be undone."
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/statements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch {
      alert("Failed to delete statement. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="rounded px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-red-900/30 hover:text-red-400 disabled:opacity-40"
    >
      {deleting ? "Deleting\u2026" : "Delete"}
    </button>
  );
}
