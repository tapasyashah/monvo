import { createSupabaseServerClient } from "@/lib/supabaseServer";

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `−$${abs}` : `+$${abs}`;
}

function formatDate(dateStr: string): string {
  // Parse as local date to avoid timezone shifts
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAccountType(type: string): string {
  return type === "credit_card" ? "Credit Card" : type.charAt(0).toUpperCase() + type.slice(1);
}

type StatementInfo = { institution: string; statement_month: string };

type TransactionRow = {
  id: string;
  date: string;
  merchant_raw: string;
  merchant_clean: string | null;
  category: string | null;
  amount: number;
  account_type: string;
  statements: StatementInfo[];
};

export default async function TransactionsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("transactions")
    .select(
      "id, date, merchant_raw, merchant_clean, category, amount, account_type, statements(institution, statement_month)"
    )
    .order("date", { ascending: false });

  const rows: TransactionRow[] = (data ?? []) as TransactionRow[];

  const totalOut = rows
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIn = rows
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Transactions
          </h1>
          <p className="text-sm text-neutral-400">
            All extracted transactions across your statements
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total", value: rows.length.toString(), sub: "transactions" },
            {
              label: "Spent",
              value: `$${Math.abs(totalOut).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              sub: "money out",
            },
            {
              label: "Received",
              value: `$${totalIn.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              sub: "money in",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-neutral-50">
                {card.value}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">{card.sub}</p>
            </div>
          ))}
        </section>

        {/* Table or empty state */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-8 py-16 text-center">
            <p className="text-sm font-medium text-neutral-300">
              No transactions yet
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Upload a statement on the{" "}
              <a href="/dashboard" className="underline hover:text-neutral-300">
                Overview
              </a>{" "}
              tab to get started.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-neutral-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900">
                    {["Date", "Merchant", "Category", "Amount", "Account", "Institution"].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-900">
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-neutral-800/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-400">
                        {formatDate(t.date)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-neutral-200">
                        {t.merchant_clean ?? t.merchant_raw}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {t.category ?? (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 font-medium tabular-nums ${
                          t.amount < 0 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {formatAmount(t.amount)}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {formatAccountType(t.account_type)}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {t.statements?.[0]?.institution ?? (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
