import { createSupabaseServerClient } from "@/lib/supabaseServer";
import DeleteStatementButton from "./DeleteStatementButton";
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
import { FileText, ArrowLeftRight } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    complete: {
      label: "Complete",
      className: "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
    },
    processing: {
      label: "Processing",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    },
    error: {
      label: "Error",
      className: "border-red-500/30 bg-red-500/10 text-red-400",
    },
  };
  const cfg = configs[status] ?? {
    label: status,
    className: "border-[var(--border)] text-[var(--muted-foreground)]",
  };
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {cfg.label}
    </Badge>
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
        <header className="space-y-1 pt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Statements
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your uploaded bank statements
          </p>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Statements
              </CardTitle>
              <FileText className="size-4 text-[var(--primary)]" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
                {rows.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">uploaded</p>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Transactions
              </CardTitle>
              <ArrowLeftRight className="size-4 text-[var(--accent)]" />
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
                {totalTransactions}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">total extracted</p>
            </CardContent>
          </Card>
        </section>

        {/* Table or empty state */}
        {rows.length === 0 ? (
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardContent className="px-8 py-16 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                No statements yet
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Upload one from the{" "}
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
                    {[
                      "Statement Month",
                      "Institution",
                      "Account",
                      "Transactions",
                      "Status",
                      "Uploaded",
                      "",
                    ].map((col, i) => (
                      <TableHead
                        key={i}
                        className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow
                      key={s.id}
                      className="border-[var(--border)] hover:bg-[var(--secondary)]/50 transition-colors"
                    >
                      <TableCell className="whitespace-nowrap font-medium text-[var(--foreground)]">
                        {formatStatementMonth(s.statement_month)}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {s.institution}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[var(--muted-foreground)]">
                        {formatAccountType(s.account_type)}
                      </TableCell>
                      <TableCell className="tabular-nums text-[var(--muted-foreground)]">
                        {s.transactions[0]?.count ?? 0}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[var(--muted-foreground)]/60">
                        {formatUploadedAt(s.uploaded_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteStatementButton id={s.id} />
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
