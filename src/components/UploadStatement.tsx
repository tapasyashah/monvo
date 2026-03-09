"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Status = "idle" | "uploading" | "done" | "error";
type AccountType = "chequing" | "savings" | "credit_card";

export default function UploadStatement(): React.JSX.Element {
  const [status, setStatus] = useState<Status>("idle");
  const [institution, setInstitution] = useState<string>("CIBC");
  const [accountType, setAccountType] = useState<AccountType>("chequing");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploading = status === "uploading";

  function handleFileSelect(selected: File | null): void {
    if (selected && selected.name.toLowerCase().endsWith(".pdf")) {
      setFile(selected);
      setStatus("idle");
      setErrorMessage("");
    } else if (selected) {
      setErrorMessage("Only PDF files are accepted.");
      setStatus("error");
    }
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
    const dropped = e.dataTransfer.files[0] ?? null;
    handleFileSelect(dropped);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const selected = e.target.files?.[0] ?? null;
    handleFileSelect(selected);
    e.target.value = "";
  }

  function handleReset(): void {
    setStatus("idle");
    setFile(null);
    setErrorMessage("");
    setTransactionCount(0);
  }

  async function handleUpload(): Promise<void> {
    if (!file || isUploading) return;
    setStatus("uploading");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("institution", institution);
    formData.append("account_type", accountType);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { transactionCount?: number; error?: string };

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Upload failed");
        return;
      }

      setTransactionCount(data.transactionCount ?? 0);
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMessage("Network error — please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">
            {transactionCount} transaction{transactionCount !== 1 ? "s" : ""} imported
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-1 text-xs text-[var(--muted-foreground)] underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
          >
            Upload another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Selects row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Institution
          </label>
          <Select
            value={institution}
            onValueChange={(v) => { if (v !== null) setInstitution(v); }}
            disabled={isUploading}
          >
            <SelectTrigger className="w-full border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]">
              <SelectValue placeholder="Select institution" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--card)]">
              <SelectItem value="CIBC">CIBC</SelectItem>
              <SelectItem value="Amex">Amex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Account Type
          </label>
          <Select
            value={accountType}
            onValueChange={(v) => setAccountType(v as AccountType)}
            disabled={isUploading}
          >
            <SelectTrigger className="w-full border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]">
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--card)]">
              <SelectItem value="chequing">Chequing</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dropzone */}
      <div className="space-y-1.5">
        <p className="block text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
          Statement PDF
        </p>
        <div
          role="button"
          tabIndex={0}
          aria-label="Click or drag to select a PDF file"
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
              : "cursor-pointer border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--secondary)]",
          )}
        >
          <Upload
            className={cn(
              "size-7 transition-colors",
              isDragging
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)]",
            )}
          />
          {file ? (
            <p className="max-w-xs truncate text-sm font-medium text-[var(--foreground)]">
              {file.name}
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--muted-foreground)]">
                Drop a PDF here, or{" "}
                <span className="text-[var(--primary)] underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="text-xs text-[var(--muted-foreground)]/60">PDF only</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Error */}
      {status === "error" && errorMessage && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={() => void handleUpload()}
        disabled={!file || isUploading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200",
          "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20",
          "hover:opacity-90 active:scale-[0.99]",
          "disabled:cursor-not-allowed disabled:opacity-40",
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
