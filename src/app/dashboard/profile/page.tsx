"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Building2, CreditCard, PiggyBank, TrendingUp, Plus, Trash2 } from "lucide-react";
import ProfileSection from "@/components/ProfileSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Bank {
  institution: string;
  account_types: string[];
  card_name?: string;
}

interface Loan {
  type: string;
  balance: number;
  rate: number;
  monthly_payment: number;
}

interface RegisteredAccount {
  type: string;
  balance: number;
  contribution_room?: number;
}

interface Investment {
  type: string;
  name: string;
  monthly_contribution: number;
}

interface UserProfile {
  banks: Bank[];
  loans: Loan[];
  registered_accounts: RegisteredAccount[];
  investments: Investment[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BANK_OPTIONS = [
  "CIBC",
  "TD",
  "RBC",
  "BMO",
  "Amex",
  "Scotia",
  "National Bank",
];

const ACCOUNT_TYPE_OPTIONS = ["Chequing", "Savings", "Credit Card"];

const LOAN_TYPE_OPTIONS = [
  "Mortgage",
  "Car Loan",
  "Personal Loan",
  "Student Loan",
  "HELOC",
];

const REGISTERED_ACCOUNT_TYPE_OPTIONS = ["RRSP", "TFSA", "GIC", "FHSA", "RESP"];

const INVESTMENT_TYPE_OPTIONS = [
  "Stocks",
  "ETF",
  "Mutual Fund",
  "Index Fund",
  "GIC",
  "Crypto",
];

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

const selectCls =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50";

const labelCls = "block text-xs font-medium text-[var(--muted-foreground)] mb-1";

// ---------------------------------------------------------------------------
// My Accounts section
// ---------------------------------------------------------------------------

function BanksDisplay({ banks }: { banks: Bank[] }): React.JSX.Element {
  if (banks.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">None added yet.</p>;
  }
  return (
    <div className="space-y-2">
      {banks.map((b, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-3"
        >
          <Badge variant="secondary">{b.institution}</Badge>
          {b.account_types.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
          {b.card_name && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {b.card_name}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function BanksEditor({
  banks,
  onChange,
}: {
  banks: Bank[];
  onChange: (banks: Bank[]) => void;
}): React.JSX.Element {
  function update(index: number, patch: Partial<Bank>): void {
    onChange(banks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function toggleAccountType(index: number, type: string): void {
    const current = banks[index].account_types;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    update(index, { account_types: next });
  }

  function remove(index: number): void {
    onChange(banks.filter((_, i) => i !== index));
  }

  function add(): void {
    onChange([
      ...banks,
      { institution: BANK_OPTIONS[0], account_types: [], card_name: "" },
    ]);
  }

  return (
    <div className="space-y-4">
      {banks.map((bank, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Account {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[var(--muted-foreground)] hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div>
            <label className={labelCls}>Institution</label>
            <select
              className={selectCls}
              value={bank.institution}
              onChange={(e) => update(i, { institution: e.target.value })}
            >
              {BANK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Account Types</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ACCOUNT_TYPE_OPTIONS.map((type) => {
                const checked = bank.account_types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleAccountType(i, type)}
                    className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50 hover:text-[var(--foreground)]"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {bank.account_types.includes("Credit Card") && (
            <div>
              <label className={labelCls}>Card Name (optional)</label>
              <Input
                placeholder="e.g. Dividend Infinite"
                value={bank.card_name ?? ""}
                onChange={(e) => update(i, { card_name: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="flex items-center gap-1.5 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <Plus className="size-3.5" />
        Add Account
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loans section
// ---------------------------------------------------------------------------

function LoansDisplay({ loans }: { loans: Loan[] }): React.JSX.Element {
  if (loans.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">None added yet.</p>;
  }
  return (
    <div className="space-y-2">
      {loans.map((l, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3"
        >
          <Badge variant="secondary">{l.type}</Badge>
          <span className="text-sm text-[var(--foreground)]">
            ${l.balance.toLocaleString()}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {l.rate}% · ${l.monthly_payment}/mo
          </span>
        </div>
      ))}
    </div>
  );
}

function LoansEditor({
  loans,
  onChange,
}: {
  loans: Loan[];
  onChange: (loans: Loan[]) => void;
}): React.JSX.Element {
  function update(index: number, patch: Partial<Loan>): void {
    onChange(loans.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function remove(index: number): void {
    onChange(loans.filter((_, i) => i !== index));
  }

  function add(): void {
    onChange([
      ...loans,
      { type: LOAN_TYPE_OPTIONS[0], balance: 0, rate: 0, monthly_payment: 0 },
    ]);
  }

  return (
    <div className="space-y-4">
      {loans.map((loan, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Loan {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[var(--muted-foreground)] hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div>
            <label className={labelCls}>Type</label>
            <select
              className={selectCls}
              value={loan.type}
              onChange={(e) => update(i, { type: e.target.value })}
            >
              {LOAN_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Balance ($)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={loan.balance === 0 ? "" : loan.balance}
                onChange={(e) =>
                  update(i, { balance: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Rate (%)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={loan.rate === 0 ? "" : loan.rate}
                onChange={(e) =>
                  update(i, { rate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Monthly Payment ($)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={loan.monthly_payment === 0 ? "" : loan.monthly_payment}
                onChange={(e) =>
                  update(i, { monthly_payment: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="flex items-center gap-1.5 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <Plus className="size-3.5" />
        Add Loan
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registered Accounts section
// ---------------------------------------------------------------------------

function RegisteredAccountsDisplay({
  accounts,
}: {
  accounts: RegisteredAccount[];
}): React.JSX.Element {
  if (accounts.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">None added yet.</p>;
  }
  return (
    <div className="space-y-2">
      {accounts.map((a, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3"
        >
          <Badge variant="secondary">{a.type}</Badge>
          <span className="text-sm text-[var(--foreground)]">
            ${a.balance.toLocaleString()}
          </span>
          {a.contribution_room !== undefined && a.contribution_room > 0 && (
            <span className="text-xs text-[var(--muted-foreground)]">
              Room: ${a.contribution_room.toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function RegisteredAccountsEditor({
  accounts,
  onChange,
}: {
  accounts: RegisteredAccount[];
  onChange: (accounts: RegisteredAccount[]) => void;
}): React.JSX.Element {
  function update(index: number, patch: Partial<RegisteredAccount>): void {
    onChange(accounts.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function remove(index: number): void {
    onChange(accounts.filter((_, i) => i !== index));
  }

  function add(): void {
    onChange([
      ...accounts,
      { type: REGISTERED_ACCOUNT_TYPE_OPTIONS[0], balance: 0 },
    ]);
  }

  return (
    <div className="space-y-4">
      {accounts.map((account, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Account {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[var(--muted-foreground)] hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div>
            <label className={labelCls}>Type</label>
            <select
              className={selectCls}
              value={account.type}
              onChange={(e) => update(i, { type: e.target.value })}
            >
              {REGISTERED_ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Balance ($)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={account.balance === 0 ? "" : account.balance}
                onChange={(e) =>
                  update(i, { balance: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Contribution Room ($, optional)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={
                  account.contribution_room === undefined || account.contribution_room === 0
                    ? ""
                    : account.contribution_room
                }
                onChange={(e) =>
                  update(i, {
                    contribution_room: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="flex items-center gap-1.5 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <Plus className="size-3.5" />
        Add Account
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Investments section
// ---------------------------------------------------------------------------

function InvestmentsDisplay({
  investments,
}: {
  investments: Investment[];
}): React.JSX.Element {
  if (investments.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">None added yet.</p>;
  }
  return (
    <div className="space-y-2">
      {investments.map((inv, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3"
        >
          <Badge variant="secondary">{inv.type}</Badge>
          <span className="text-sm text-[var(--foreground)]">{inv.name}</span>
          <span className="text-xs text-[var(--muted-foreground)]">
            ${inv.monthly_contribution}/mo
          </span>
        </div>
      ))}
    </div>
  );
}

function InvestmentsEditor({
  investments,
  onChange,
}: {
  investments: Investment[];
  onChange: (investments: Investment[]) => void;
}): React.JSX.Element {
  function update(index: number, patch: Partial<Investment>): void {
    onChange(investments.map((inv, i) => (i === index ? { ...inv, ...patch } : inv)));
  }

  function remove(index: number): void {
    onChange(investments.filter((_, i) => i !== index));
  }

  function add(): void {
    onChange([
      ...investments,
      { type: INVESTMENT_TYPE_OPTIONS[0], name: "", monthly_contribution: 0 },
    ]);
  }

  return (
    <div className="space-y-4">
      {investments.map((inv, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Investment {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[var(--muted-foreground)] hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div>
            <label className={labelCls}>Type</label>
            <select
              className={selectCls}
              value={inv.type}
              onChange={(e) => update(i, { type: e.target.value })}
            >
              {INVESTMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name / Ticker</label>
              <Input
                placeholder="e.g. XEQT"
                value={inv.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Monthly Contribution ($)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={inv.monthly_contribution === 0 ? "" : inv.monthly_contribution}
                onChange={(e) =>
                  update(i, {
                    monthly_contribution: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="flex items-center gap-1.5 border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <Plus className="size-3.5" />
        Add Investment
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const EMPTY_PROFILE: UserProfile = {
  banks: [],
  loans: [],
  registered_accounts: [],
  investments: [],
};

type LoadState = "loading" | "error" | "success";

export default function ProfilePage(): React.JSX.Element {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json() as Promise<UserProfile>;
      })
      .then((data) => {
        setProfile(data);
        setLoadState("success");
      })
      .catch(() => {
        setLoadState("error");
      });
  }, []);

  const saveProfile = useCallback(async (): Promise<void> => {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      throw new Error("Failed to save profile");
    }
  }, [profile]);

  if (loadState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)]">Loading profile...</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-destructive">
          Could not load your profile. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <header className="space-y-1 pt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Financial Profile
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tell us about your accounts, loans, and investments to get better recommendations.
          </p>
        </header>

        {/* My Accounts */}
        <ProfileSection
          title="My Accounts"
          icon={<Building2 className="size-4" />}
          isEmpty={profile.banks.length === 0}
          emptyMessage="No bank accounts added yet. Click Edit to add your accounts."
          onSave={saveProfile}
        >
          {(isEditing) =>
            isEditing ? (
              <BanksEditor
                banks={profile.banks}
                onChange={(banks) => setProfile((p) => ({ ...p, banks }))}
              />
            ) : (
              <BanksDisplay banks={profile.banks} />
            )
          }
        </ProfileSection>

        {/* Loans */}
        <ProfileSection
          title="Loans"
          icon={<CreditCard className="size-4" />}
          isEmpty={profile.loans.length === 0}
          emptyMessage="No loans added yet. Click Edit to add your loans."
          onSave={saveProfile}
        >
          {(isEditing) =>
            isEditing ? (
              <LoansEditor
                loans={profile.loans}
                onChange={(loans) => setProfile((p) => ({ ...p, loans }))}
              />
            ) : (
              <LoansDisplay loans={profile.loans} />
            )
          }
        </ProfileSection>

        {/* Registered Accounts */}
        <ProfileSection
          title="Registered Accounts"
          icon={<PiggyBank className="size-4" />}
          isEmpty={profile.registered_accounts.length === 0}
          emptyMessage="No registered accounts added yet. Click Edit to add RRSP, TFSA, etc."
          onSave={saveProfile}
        >
          {(isEditing) =>
            isEditing ? (
              <RegisteredAccountsEditor
                accounts={profile.registered_accounts}
                onChange={(registered_accounts) =>
                  setProfile((p) => ({ ...p, registered_accounts }))
                }
              />
            ) : (
              <RegisteredAccountsDisplay accounts={profile.registered_accounts} />
            )
          }
        </ProfileSection>

        {/* Investments */}
        <ProfileSection
          title="Investments"
          icon={<TrendingUp className="size-4" />}
          isEmpty={profile.investments.length === 0}
          emptyMessage="No investments added yet. Click Edit to add your portfolio."
          onSave={saveProfile}
        >
          {(isEditing) =>
            isEditing ? (
              <InvestmentsEditor
                investments={profile.investments}
                onChange={(investments) => setProfile((p) => ({ ...p, investments }))}
              />
            ) : (
              <InvestmentsDisplay investments={profile.investments} />
            )
          }
        </ProfileSection>
      </div>
    </div>
  );
}
