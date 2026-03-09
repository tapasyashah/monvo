import { createSupabaseServerClient } from "@/lib/supabaseServer";
import UploadStatement from "@/components/UploadStatement";

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
    { label: "Statements", value: `${statementCount} uploaded` },
    { label: "Transactions", value: `${transactionCount} extracted` },
    { label: "Recommendations", value: `${recommendationCount} available` },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Greeting */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Welcome, {email}
          </h1>
          <p className="text-sm text-neutral-400">
            Here&apos;s your financial overview
          </p>
        </header>

        {/* Stat cards */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-neutral-50">
                  {stat.value.split(" ")[0]}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {stat.value.split(" ").slice(1).join(" ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Upload section */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          {/* Upload icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-400"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <h2 className="text-base font-semibold text-neutral-100">
            Upload your first statement
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-400">
            Drop in a PDF from CIBC, TD, RBC, or any Canadian bank. We&apos;ll
            handle the rest.
          </p>

          <div className="mt-6 text-left">
            <UploadStatement />
          </div>
        </section>
      </div>
    </div>
  );
}
