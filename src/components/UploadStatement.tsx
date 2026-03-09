"use client";

import { useRef, useState } from "react";

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
    // Reset so re-selecting the same file fires onChange again
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
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm font-semibold text-emerald-400">
          {transactionCount} transaction{transactionCount !== 1 ? "s" : ""} imported
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-3 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-200 transition-colors"
        >
          Upload another
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-5">
      {/* Institution */}
      <div className="space-y-1.5">
        <label
          htmlFor="upload-institution"
          className="block text-xs font-semibold uppercase tracking-widest text-neutral-400"
        >
          Institution
        </label>
        <select
          id="upload-institution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          disabled={isUploading}
          className="bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm px-3 py-2 w-full disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        >
          <option value="CIBC">CIBC</option>
          <option value="Amex">Amex</option>
        </select>
      </div>

      {/* Account type */}
      <div className="space-y-1.5">
        <label
          htmlFor="upload-account-type"
          className="block text-xs font-semibold uppercase tracking-widest text-neutral-400"
        >
          Account Type
        </label>
        <select
          id="upload-account-type"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as AccountType)}
          disabled={isUploading}
          className="bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-sm px-3 py-2 w-full disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        >
          <option value="chequing">Chequing</option>
          <option value="savings">Savings</option>
          <option value="credit_card">Credit Card</option>
        </select>
      </div>

      {/* Dropzone */}
      <div className="space-y-1.5">
        <p className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">
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
          className={[
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            isUploading
              ? "cursor-not-allowed opacity-50 border-neutral-700"
              : "cursor-pointer",
            isDragging && !isUploading
              ? "border-neutral-400 bg-neutral-800/50"
              : !isUploading
              ? "border-neutral-700 hover:border-neutral-500"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Upload icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 text-neutral-500"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          {file ? (
            <p className="text-sm text-neutral-200 font-medium truncate max-w-xs mx-auto">
              {file.name}
            </p>
          ) : (
            <>
              <p className="text-sm text-neutral-300">
                Drop a PDF here, or{" "}
                <span className="text-neutral-100 underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="mt-1 text-xs text-neutral-600">PDF only</p>
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

      {/* Error message */}
      {status === "error" && errorMessage && (
        <p className="text-sm text-red-400">{errorMessage}</p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={() => void handleUpload()}
        disabled={!file || isUploading}
        className="bg-white text-neutral-950 font-semibold rounded-lg px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed w-full flex items-center justify-center gap-2 transition-opacity"
      >
        {isUploading ? (
          <>
            {/* Inline spinner */}
            <svg
              className="animate-spin h-4 w-4 text-neutral-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Uploading...
          </>
        ) : (
          "Upload & Extract"
        )}
      </button>
    </div>
  );
}
