import { createSupabaseServerClient } from "@/lib/supabaseServer";
import DeleteStatementButton from "./DeleteStatementButton";

type StatementRow = {
  id: string;
  institution: string;
  account_type: string;
  statement_month: string;
  status: string;
  uploaded_at: string;
  transactions: { count: number }[];
};

function formatStatementMonth(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    month: "short",
    year: "numeric",
  });
}

function formatUploadedAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAccountType(type: string): string {
  return type === "credit_card"
    ? "Credit Card"
    : type.charAt(0).toUpperCase() + type.slice(1);
}

type StatusConfig = {
  dot: string;
  label: string;
  text: string;
};

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, StatusConfig> = {
    complete: {
      dot: "bg-emerald-400",
      label: "Complete",
      text: "text-emerald-400",
    },
    processing: {
      dot: "bg-yellow-400",
      label: "Processing",
      text: "text-yellow-400",
    },
    error: { dot: "bg-red-400", label: "Error", text: "text-red-400" },
  };
  const cfg = configs[status] ?? {
    dot: "bg-neutral-500",
    label: status,
    text: "text-neutral-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default async function StatementsPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("statements")
    .select(
      "id, institution, account_type, statement_month, status, uploaded_at, transactions(count)"
    )
    .order("statement_month", { ascending: false });

  const rows: StatementRow[] = ((data ?? []) as unknown as StatementRow[]).map(
    (s) => ({
      ...s,
      transactions: (s.transactions as unknown as { count: number }[]) ?? [],
    })
  );

  const totalTransactions = rows.reduce(
    (sum, s) => sum + (s.transactions[0]?.count ?? 0),
    0
  );

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Statements
          </h1>
          <p className="text-sm text-neutral-400">
            Your uploaded bank statements
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              label: "Statements",
              value: rows.length.toString(),
              sub: "uploaded",
            },
            {
              label: "Transactions",
              value: totalTransactions.toString(),
              sub: "total extracted",
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
              No statements yet
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Upload one from the{" "}
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
                    {[
                      "Statement Month",
                      "Institution",
                      "Account",
                      "Transactions",
                      "Status",
                      "Uploaded",
                      "",
                    ].map((col, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-900">
                  {rows.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-neutral-800/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-200">
                        {formatStatementMonth(s.statement_month)}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {s.institution}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-400">
                        {formatAccountType(s.account_type)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-400">
                        {s.transactions[0]?.count ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                        {formatUploadedAt(s.uploaded_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteStatementButton id={s.id} />
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
