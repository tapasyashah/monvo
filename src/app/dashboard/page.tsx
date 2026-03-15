import { createSupabaseServerClient } from "@/lib/supabaseServer";
import UploadStatement from "@/components/UploadStatement";
import AskMonvoCard from "@/components/AskMonvoCard";
import CardOptimizerPanel from "@/components/cards/CardOptimizerPanel";
import IncomeCard from "@/components/dashboard/IncomeCard";
import CashFlowPanel from "@/components/cashflow/CashFlowPanel";
import NetWorthPanel from "@/components/networth/NetWorthPanel";
import NudgeFeed from "@/components/nudges/NudgeFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { FileText, ArrowLeftRight, Sparkles, Upload } from "lucide-react";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "there";

  const [statementsResult, transactionsResult, recommendationsResult] =
    await Promise.all([
      supabase.from("statements").select("*", { count: "exact", head: true }),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
      supabase
        .from("recommendations")
        .select("*", { count: "exact", head: true }),
    ]);

  const statementCount = statementsResult.count ?? 0;
  const transactionCount = transactionsResult.count ?? 0;
  const recommendationCount = recommendationsResult.count ?? 0;

  const stats = [
    {
      label: "Statements",
      value: statementCount,
      sub: "uploaded",
      icon: FileText,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--primary)]/10",
    },
    {
      label: "Transactions",
      value: transactionCount,
      sub: "extracted",
      icon: ArrowLeftRight,
      color: "text-[var(--accent)]",
      bg: "bg-[var(--accent)]/10",
    },
    {
      label: "Recommendations",
      value: recommendationCount,
      sub: "available",
      icon: Sparkles,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  const firstName = email.split("@")[0];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="space-y-1 pt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Good day,{" "}
            <span className="text-[var(--primary)]">{firstName}</span>
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Here&apos;s your financial overview
          </p>
        </header>

        {/* Income / Cash Flow */}
        <section>
          <IncomeCard />
        </section>

        {/* Proactive AI Nudges */}
        <section>
          <NudgeFeed />
        </section>

        {/* Cash Flow Panel */}
        <section>
          <CashFlowPanel />
        </section>

        {/* Net Worth Panel (P2-D) */}
        <section>
          <NetWorthPanel />
        </section>

        {/* Stat cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[var(--primary)]/30"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    {stat.label}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bg}`}>
                    <Icon className={`size-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-3xl font-bold text-[var(--foreground)] tabular-nums">
                    <NumberTicker value={stat.value} />
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {stat.sub}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Upload section */}
        <section>
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader className="px-8 pt-8 pb-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <Upload className="size-5 text-[var(--primary)]" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                    Upload a statement
                  </CardTitle>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                    Supports CIBC chequing, savings &amp; Visa · American Express
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-6">
              <UploadStatement />
            </CardContent>
          </Card>
        </section>

        {/* Credit Card Optimizer (P3-D) */}
        <section>
          <CardOptimizerPanel />
        </section>

        {/* Ask Monvo */}
        <section>
          <AskMonvoCard />
        </section>
      </div>
    </div>
  );
}
