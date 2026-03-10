"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileEntry {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  transactionCount: number;
  errorMessage: string;
}

export default function UploadStatement(): React.JSX.Element {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const isUploading = entries.some((e) => e.status === "uploading");
  const allDone =
    entries.length > 0 &&
    entries.every((e) => e.status === "done" || e.status === "error");
  const totalTransactions = entries.reduce((s, e) => s + e.transactionCount, 0);

  function addFiles(incoming: FileList | File[]): void {
    const pdfs = Array.from(incoming).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (!pdfs.length) return;
    setEntries((prev) => [
      ...prev,
      ...pdfs.map((file) => ({
        file,
        status: "pending" as const,
        transactionCount: 0,
        errorMessage: "",
      })),
    ]);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  async function handleUpload(): Promise<void> {
    if (isUploading) return;
    const snapshot = [...entries];
    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].status !== "pending") continue;
      setEntries((prev) =>
        prev.map((e, idx) =>
          idx === i ? { ...e, status: "uploading" } : e
        )
      );
      const fd = new FormData();
      fd.append("file", snapshot[i].file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as {
          transactionCount?: number;
          error?: string;
        };
        setEntries((prev) =>
          prev.map((e, idx) =>
            idx === i
              ? res.ok
                ? { ...e, status: "done", transactionCount: data.transactionCount ?? 0 }
                : { ...e, status: "error", errorMessage: data.error ?? "Upload failed" }
              : e
          )
        );
      } catch {
        setEntries((prev) =>
          prev.map((e, idx) =>
            idx === i
              ? { ...e, status: "error", errorMessage: "Network error — please try again." }
              : e
          )
        );
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag to select PDF files"
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-8 py-10 text-center transition-all duration-200",
          isUploading
            ? "cursor-not-allowed opacity-50 border-[var(--border)]"
            : isDragging
            ? "cursor-copy border-[var(--primary)] bg-[var(--primary)]/5"
            : "cursor-pointer border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--secondary)]"
        )}
      >
        <Upload
          className={cn(
            "size-7 transition-colors",
            isDragging ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
          )}
        />
        {entries.length > 0 ? (
          <p className="text-sm font-medium text-[var(--foreground)]">
            {entries.length} file{entries.length !== 1 ? "s" : ""} selected
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--muted-foreground)]">
              Drop PDFs here, or{" "}
              <span className="text-[var(--primary)] underline underline-offset-2">
                browse
              </span>
            </p>
            <p className="text-xs text-[var(--muted-foreground)]/60">
              Multiple PDFs supported · Institution auto-detected
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="sr-only"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* File list */}
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry, i) => (
            <li
              key={`${entry.file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2"
            >
              {entry.status === "pending" && (
                <span className="size-4 shrink-0 rounded-full border-2 border-[var(--muted-foreground)]/40" />
              )}
              {entry.status === "uploading" && (
                <Loader2 className="size-4 shrink-0 animate-spin text-[var(--primary)]" />
              )}
              {entry.status === "done" && (
                <CheckCircle2 className="size-4 shrink-0 text-[var(--accent)]" />
              )}
              {entry.status === "error" && (
                <XCircle className="size-4 shrink-0 text-red-400" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
                {entry.file.name}
              </span>
              {entry.status === "done" && (
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  {entry.transactionCount} tx
                </span>
              )}
              {entry.status === "error" && (
                <span className="shrink-0 max-w-[160px] truncate text-xs text-red-400">
                  {entry.errorMessage}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Summary bar */}
      {allDone && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[var(--accent)]" />
            <p className="text-sm font-semibold text-[var(--accent)]">
              {totalTransactions} transaction{totalTransactions !== 1 ? "s" : ""} imported
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEntries([])}
            className="text-xs text-[var(--muted-foreground)] underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
          >
            Upload more
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={() => void handleUpload()}
        disabled={pendingCount === 0 || isUploading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200",
          "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20",
          "hover:opacity-90 active:scale-[0.99]",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="size-4" />
            Upload &amp; Extract
          </>
        )}
      </button>
    </div>
  );
}
