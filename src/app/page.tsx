import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-16 px-6 pb-24 pt-20 md:flex-row md:items-center md:pb-32 md:pt-32">
        {/* Hero copy */}
        <section className="flex-1 space-y-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Monvo
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-neutral-50 md:text-5xl">
            Your financial life,{" "}
            <span className="text-neutral-300">understood.</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-neutral-400">
            Upload your Canadian bank statement and get instant clarity — spending
            patterns, subscription leaks, better credit card options, and
            high-interest savings accounts tailored to you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-neutral-50 px-5 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-50"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* How it works card */}
        <section className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
            How it works
          </p>
          <ol className="space-y-6">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-neutral-700 text-xs font-semibold text-neutral-400">
                1
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-100">Upload</p>
                <p className="text-sm leading-relaxed text-neutral-400">
                  Drop in your bank statement PDF from CIBC, TD, RBC, BMO, or
                  any Canadian bank.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-neutral-700 text-xs font-semibold text-neutral-400">
                2
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-100">Analyze</p>
                <p className="text-sm leading-relaxed text-neutral-400">
                  AI extracts every transaction, categorizes spending, and flags
                  recurring subscriptions automatically.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-neutral-700 text-xs font-semibold text-neutral-400">
                3
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-100">Act</p>
                <p className="text-sm leading-relaxed text-neutral-400">
                  Get tailored recommendations — better credit cards, HISA rates,
                  subscription cuts, and debt paydown strategies.
                </p>
              </div>
            </li>
          </ol>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-6 text-center">
        <p className="text-xs text-neutral-600">
          For personal use only. Not financial advice.
        </p>
      </footer>
    </main>
  );
}
