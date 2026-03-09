"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  BarChart2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/dashboard/transactions", icon: ArrowLeftRight },
  { label: "Statements", href: "/dashboard/statements", icon: FileText },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { label: "Recommendations", href: "/dashboard/recommendations", icon: Sparkles },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b bg-[#0D0D18]/90 border-[var(--border)] backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 md:px-10">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="shrink-0 text-sm font-bold tracking-[0.2em] text-[var(--primary)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          MONVO
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border)] shrink-0" />

        {/* Tab scroll container */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
                  isActive
                    ? "bg-[var(--primary)] text-white font-medium shadow-lg shadow-[var(--primary)]/20"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
