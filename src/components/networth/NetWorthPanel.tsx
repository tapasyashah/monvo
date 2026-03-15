"use client";

import React, { useState } from "react";
import { useNetWorth, type UserAsset } from "@/lib/hooks/useNetWorth";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

// ---------------------------------------------------------------------------
// P2-D: Net Worth Panel — track investment accounts and manual assets
// ---------------------------------------------------------------------------

function formatDollar(v: number): string {
  return "$" + v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditAssetModal({
  asset,
  onClose,
  onSaved,
}: {
  asset: UserAsset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = asset === null;
  const [institution, setInstitution] = useState(asset?.institution ?? "");
  const [label, setLabel] = useState(asset?.account_label ?? "");
  const [value, setValue] = useState(asset?.current_value?.toString() ?? "");
  const [assetType, setAssetType] = useState(asset?.asset_type ?? "investment_account");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const numValue = parseFloat(value) || 0;

    if (isNew) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_assets").insert({
        user_id: user.id,
        institution,
        account_label: label || null,
        current_value: numValue,
        asset_type: assetType,
        last_updated: new Date().toISOString().split("T")[0],
      });
    } else {
      await supabase
        .from("user_assets")
        .update({
          institution,
          account_label: label || null,
          current_value: numValue,
          asset_type: assetType,
          last_updated: new Date().toISOString().split("T")[0],
        })
        .eq("id", asset.id);
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          {isNew ? "Add Asset" : "Update Asset"}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">Institution</label>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Wealthsimple"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">Label (optional)</label>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. TFSA"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">Type</label>
            <select
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              <option value="investment_account">Investment Account</option>
              <option value="savings">Savings</option>
              <option value="property">Property</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--muted-foreground)]">Current Value ($)</label>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !institution}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export default function NetWorthPanel(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useNetWorth();
  const [collapsed, setCollapsed] = useState(false);
  const [editingAsset, setEditingAsset] = useState<UserAsset | null | "new">(null);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-[var(--border)]" />
        <div className="mt-4 space-y-3">
          <div className="h-10 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-10 animate-pulse rounded bg-[var(--border)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/50 bg-[var(--card)] p-6">
        <p className="text-sm text-red-400">Failed to load net worth: {error}</p>
      </div>
    );
  }

  const { assets, totalValue, ytdContributions } = data ?? {
    assets: [],
    totalValue: 0,
    ytdContributions: 0,
  };

  return (
    <>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {/* Header */}
        <button
          className="flex w-full items-center justify-between px-6 py-5"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="text-left">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Net Worth
            </h2>
            <p className="mt-0.5 text-2xl font-bold text-[#00E5BE] tabular-nums">
              {formatDollar(totalValue)}
            </p>
          </div>
          <svg
            className={`size-5 text-[var(--muted-foreground)] transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Body */}
        {!collapsed && (
          <div className="border-t border-[var(--border)] px-6 pb-6 pt-4">
            {/* Assets list */}
            {assets.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
                No assets tracked yet. Add your first one below.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Investments
                </p>
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 px-4 py-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {asset.institution}
                        {asset.account_label && (
                          <span className="ml-1 text-[var(--muted-foreground)]">
                            ({asset.account_label})
                          </span>
                        )}
                      </p>
                      {asset.last_updated && (
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          Updated {asset.last_updated}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                        {formatDollar(asset.current_value)}
                      </span>
                      <button
                        className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10"
                        onClick={() => setEditingAsset(asset)}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* YTD Contributions */}
            {ytdContributions > 0 && (
              <div className="mt-4 rounded-lg bg-[#00E5BE]/5 px-4 py-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  This year contributions
                </p>
                <p className="text-sm font-semibold text-[#00E5BE]">
                  {formatDollar(ytdContributions)}
                </p>
              </div>
            )}

            {/* TODO: TFSA room tracking requires statement parsing — see P3-B */}

            {/* Add button */}
            <button
              className="mt-4 w-full rounded-lg border border-dashed border-[var(--border)] py-2.5 text-xs font-medium text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              onClick={() => setEditingAsset("new")}
            >
              + Add asset
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingAsset !== null && (
        <EditAssetModal
          asset={editingAsset === "new" ? null : editingAsset}
          onClose={() => setEditingAsset(null)}
          onSaved={refetch}
        />
      )}
    </>
  );
}
