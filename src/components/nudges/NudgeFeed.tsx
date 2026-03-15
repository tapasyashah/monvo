"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Nudge {
  id: string;
  nudge_type: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "alert";
  dismissed: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<
  Nudge["severity"],
  { border: string; iconColor: string; bg: string }
> = {
  info: {
    border: "border-l-[var(--primary)]",
    iconColor: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/5",
  },
  warning: {
    border: "border-l-amber-400",
    iconColor: "text-amber-400",
    bg: "bg-amber-400/5",
  },
  alert: {
    border: "border-l-red-400",
    iconColor: "text-red-400",
    bg: "bg-red-400/5",
  },
};

// ---------------------------------------------------------------------------
// SVG icons (no emoji)
// ---------------------------------------------------------------------------

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 9v5M10 6.5v.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 2L1 18h18L10 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 8v4M10 14.5v.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v5M10 13.5v.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 7l6 6M13 7l-6 6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

function DismissIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SEVERITY_ICON: Record<
  Nudge["severity"],
  React.ComponentType<{ className?: string }>
> = {
  info: InfoIcon,
  warning: WarningIcon,
  alert: AlertIcon,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NudgeFeed() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  const fetchNudges = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("nudges")
      .select("id, nudge_type, title, body, severity, dismissed, created_at")
      .eq("user_id", user.id)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(3);

    setNudges((data as Nudge[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const handleDismiss = async (id: string) => {
    // Optimistic removal
    setNudges((prev) => prev.filter((n) => n.id !== id));

    await supabase
      .from("nudges")
      .update({ dismissed: true })
      .eq("id", id);
  };

  if (loading || nudges.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        Nudges
      </h2>
      {nudges.map((nudge) => {
        const style = SEVERITY_STYLES[nudge.severity];
        const Icon = SEVERITY_ICON[nudge.severity];

        return (
          <div
            key={nudge.id}
            className={`relative rounded-lg border border-[var(--border)] ${style.border} border-l-[3px] ${style.bg} bg-[var(--card)] p-4 transition-colors`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                <Icon className={`${style.iconColor}`} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {nudge.title}
                </p>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {nudge.body}
                </p>
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-[var(--primary)] hover:underline"
                  onClick={() => {
                    // Stub: future link to Ask Monvo with nudge context
                  }}
                >
                  Tell me more
                </button>
              </div>

              {/* Dismiss */}
              <button
                type="button"
                onClick={() => handleDismiss(nudge.id)}
                className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                aria-label="Dismiss nudge"
              >
                <DismissIcon />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
