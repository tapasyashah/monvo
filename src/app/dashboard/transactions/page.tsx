import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeftRight, TrendingDown, TrendingUp } from "lucide-react";

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `−$${abs}` : `+$${abs}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-CA", {
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
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="space-y-1 pt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Transactions
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            All extracted transactions across your statements
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Total
              </CardTitle>
              <ArrowLeftRight className="size-4 text-[var(--primary)]" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
                {rows.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">transactions</p>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Spent
              </CardTitle>
              <TrendingDown className="size-4 text-red-400" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold tabular-nums text-red-400">
                $
                {Math.abs(totalOut).toLocaleString("en-CA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">money out</p>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Received
              </CardTitle>
              <TrendingUp className="size-4 text-[var(--accent)]" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold tabular-nums text-[var(--accent)]">
                $
                {totalIn.toLocaleString("en-CA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">money in</p>
            </CardContent>
          </Card>
        </section>

        {/* Table or empty state */}
        {rows.length === 0 ? (
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardContent className="px-8 py-16 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                No transactions yet
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Upload a statement on the{" "}
                <a
                  href="/dashboard"
                  className="text-[var(--primary)] underline hover:opacity-80"
                >
                  Overview
                </a>{" "}
                tab to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[var(--border)] hover:bg-transparent">
                    {["Date", "Merchant", "Category", "Amount", "Account", "Institution"].map(
                      (col) => (
                        <TableHead
                          key={col}
                          className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]"
                        >
                          {col}
                        </TableHead>
                      )
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow
                      key={t.id}
                      className="border-[var(--border)] hover:bg-[var(--secondary)]/50 transition-colors"
                    >
                      <TableCell className="whitespace-nowrap text-[var(--muted-foreground)]">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium text-[var(--foreground)]">
                        {t.merchant_clean ?? t.merchant_raw}
                      </TableCell>
                      <TableCell>
                        {t.category ? (
                          <Badge
                            variant="secondary"
                            className="border-0 bg-[var(--secondary)] text-[var(--muted-foreground)] text-xs"
                          >
                            {t.category}
                          </Badge>
                        ) : (
                          <span className="text-[var(--muted-foreground)]/40">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`whitespace-nowrap font-semibold tabular-nums ${
                          t.amount < 0 ? "text-red-400" : "text-[var(--accent)]"
                        }`}
                      >
                        {formatAmount(t.amount)}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {formatAccountType(t.account_type)}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {t.statements?.[0]?.institution ?? (
                          <span className="text-[var(--muted-foreground)]/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
