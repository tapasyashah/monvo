"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type RecurringItem = {
  merchant: string;
  subCategory: string;
  monthlyAvg: number;
  annualEst: number;
};

type Props = {
  recurringList: RecurringItem[];
  totalMonthlyRecurring: number;
};

export default function RecurringSection({
  recurringList,
  totalMonthlyRecurring,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [addMerchant, setAddMerchant] = useState("");
  const [adding, setAdding] = useState(false);

  const setOverride = async (merchant: string, value: boolean): Promise<void> => {
    const res = await fetch("/api/profile/recurring-overrides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, value }),
    });
    if (res.ok) router.refresh();
  };

  const handleAddRecurring = async (): Promise<void> => {
    const name = addMerchant.trim();
    if (!name) return;
    setAdding(true);
    const res = await fetch("/api/profile/recurring-overrides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant: name, value: true }),
    });
    setAdding(false);
    if (res.ok) {
      setAddMerchant("");
      router.refresh();
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Recurring & Subscriptions
        </h2>
        {recurringList.length > 0 && (
          <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
            ${totalMonthlyRecurring.toFixed(2)}/mo
          </span>
        )}
      </div>

      {recurringList.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No recurring transactions detected yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <th className="pb-2 pr-4 font-medium">Merchant</th>
                <th className="pb-2 pr-4 font-medium">Category</th>
                <th className="pb-2 pr-4 text-right font-medium">Monthly</th>
                <th className="pb-2 pr-4 text-right font-medium">Annual Est.</th>
                <th className="pb-2 w-0 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {recurringList.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--border)]/50 last:border-0"
                >
                  <td className="py-2.5 pr-4 font-medium text-[var(--foreground)]">
                    {r.merchant}
                  </td>
                  <td className="py-2.5 pr-4 text-[var(--muted-foreground)]">
                    {r.subCategory}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[var(--foreground)]">
                    ${r.monthlyAvg.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[var(--muted-foreground)]">
                    ${r.annualEst.toFixed(2)}
                  </td>
                  <td className="py-2.5 pl-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => setOverride(r.merchant, false)}
                    >
                      Not recurring
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)]/50 pt-4">
        <span className="text-xs text-[var(--muted-foreground)]">
          Add a merchant as recurring (e.g. AGF Investments):
        </span>
        <Input
          placeholder="Merchant name"
          value={addMerchant}
          onChange={(e) => setAddMerchant(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddRecurring()}
          className="h-8 w-48 text-sm"
        />
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          disabled={!addMerchant.trim() || adding}
          onClick={handleAddRecurring}
        >
          {adding ? "Adding…" : "Mark as recurring"}
        </Button>
      </div>
    </div>
  );
}
