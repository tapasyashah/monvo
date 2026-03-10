"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Upload,
  Brain,
  TrendingUp,
  BarChart3,
  RefreshCw,
  User,
  CreditCard,
} from "lucide-react";

export default function Home(): React.JSX.Element {
  return (
    <main
      className="min-h-screen text-neutral-50 overflow-x-hidden"
      style={{ background: "#0a0a14" }}
    >
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center">
        {/* Background gradients */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(0,210,160,0.1) 0%, transparent 60%)",
          }}
        />

        {/* Dot grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Floating orbs */}
        <motion.div
          className="pointer-events-none absolute left-[10%] top-[15%] h-64 w-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(108,99,255,0.25) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-[5%] top-[60%] h-48 w-48 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,210,160,0.2) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{
            repeat: Infinity,
            duration: 7,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
        <motion.div
          className="pointer-events-none absolute left-[50%] bottom-[10%] h-40 w-40 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "easeInOut",
            delay: 3,
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-16 px-6 py-24 lg:flex-row lg:items-center lg:gap-20 lg:py-32">
          {/* Left — copy */}
          <motion.div
            className="flex flex-1 flex-col gap-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300 backdrop-blur-sm">
              <span
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ background: "#00D2A0" }}
              />
              AI-Powered Finance
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-bold leading-tight tracking-tight lg:text-7xl">
              Your financial life,
              <br />
              <span
                className="bg-gradient-to-r from-[#6C63FF] to-[#00D2A0] bg-clip-text text-transparent"
              >
                understood.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="max-w-lg text-base leading-relaxed text-neutral-400 lg:text-lg">
              Upload your Canadian bank statement and get instant clarity —
              spending patterns, subscription leaks, better credit card options,
              and high-interest savings accounts tailored to you.
            </p>

            {/* CTA row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(108,99,255,0.4)]"
                style={{ background: "#6C63FF" }}
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl px-7 py-3 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
              >
                Sign in →
              </Link>
            </div>
          </motion.div>

          {/* Right — floating mock cards */}
          <div className="relative flex flex-1 justify-center lg:justify-end">
            <div className="relative h-80 w-80 lg:h-96 lg:w-96">
              {/* Card 1 — spending breakdown */}
              <motion.div
                className="absolute left-0 top-0 w-64 backdrop-blur-xl rounded-2xl p-4 lg:w-72"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                animate={{ y: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  This Month
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Groceries", amount: "$245", color: "#6C63FF", pct: "70%" },
                    { label: "Dining", amount: "$189", color: "#00D2A0", pct: "54%" },
                    { label: "Transport", amount: "$98", color: "#818CF8", pct: "28%" },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-300">{item.label}</span>
                        <span className="font-semibold text-neutral-100">
                          {item.amount}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/10">
                        <div
                          className="h-1 rounded-full"
                          style={{ width: item.pct, background: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Card 2 — insight tip */}
              <motion.div
                className="absolute bottom-0 right-0 w-56 backdrop-blur-xl rounded-2xl p-4 lg:w-64"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                animate={{ y: [8, -8, 8] }}
                transition={{
                  repeat: Infinity,
                  duration: 5,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <div className="mb-2 flex items-start gap-2">
                  <span className="text-base">💡</span>
                  <p className="text-xs leading-snug text-neutral-200">
                    Switch to EQ Bank HISA — Save $120/yr
                  </p>
                </div>
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(0,210,160,0.2)", color: "#00D2A0" }}
                >
                  Savings tip
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-neutral-50">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: <Upload className="h-5 w-5 text-white" />,
                title: "Upload Your PDF",
                description:
                  "Drop in your bank statement from CIBC, TD, RBC, BMO, Amex, or any Canadian bank.",
                delay: 0,
              },
              {
                step: "02",
                icon: <Brain className="h-5 w-5 text-white" />,
                title: "AI Extracts & Categorizes",
                description:
                  "Claude AI reads every transaction, categorizes spending, and detects recurring subscriptions.",
                delay: 0.15,
              },
              {
                step: "03",
                icon: <TrendingUp className="h-5 w-5 text-white" />,
                title: "Get Smart Insights",
                description:
                  "Receive tailored recommendations — better credit cards, HISA rates, and debt strategies.",
                delay: 0.3,
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                className="flex flex-col gap-5 rounded-2xl p-6 backdrop-blur-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.delay }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D2A0]"
                  >
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold tracking-widest text-neutral-600">
                    {item.step}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-semibold text-neutral-100">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-400">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Grid ──────────────────────────────────────── */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-neutral-50">
              Everything You Need
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              {
                icon: <BarChart3 className="h-5 w-5 text-white" />,
                title: "Month-over-Month Analytics",
                description:
                  "See how your spending shifts each month with visual breakdowns.",
                delay: 0,
              },
              {
                icon: <RefreshCw className="h-5 w-5 text-white" />,
                title: "Recurring Detection",
                description:
                  "Automatically surfaces subscriptions and recurring charges you might have forgotten.",
                delay: 0.1,
              },
              {
                icon: <User className="h-5 w-5 text-white" />,
                title: "Smart Profile Recommendations",
                description:
                  "Your financial profile (cards, loans, RRSPs) shapes every recommendation we make.",
                delay: 0.2,
              },
              {
                icon: <CreditCard className="h-5 w-5 text-white" />,
                title: "Refund Tracking",
                description:
                  "Every refund, reversal, and credit is tracked and shown separately from income.",
                delay: 0.3,
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                className="flex flex-col gap-4 rounded-2xl p-6 backdrop-blur-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item.delay }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D2A0]"
                >
                  {item.icon}
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-semibold text-neutral-100">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-400">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Strip ─────────────────────────────────────────── */}
      <section className="relative py-24">
        {/* Gradient border-top trick */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(to right, #6C63FF, #00D2A0)",
          }}
        />

        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-neutral-50 lg:text-4xl">
              Ready to understand your finances?
            </h2>
            <p className="text-base text-neutral-400">
              Join thousands of Canadians making smarter money decisions.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(108,99,255,0.4)]"
              style={{ background: "#6C63FF" }}
            >
              Get started free →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="py-8 text-center">
        <p className="text-xs text-neutral-600">
          For personal use only. Not financial advice.
        </p>
      </footer>
    </main>
  );
}
