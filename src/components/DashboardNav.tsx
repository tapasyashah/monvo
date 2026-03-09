"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/dashboard" },
  { label: "Transactions", href: "/dashboard/transactions" },
  { label: "Statements", href: "/dashboard/statements" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Recommendations", href: "/dashboard/recommendations" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-neutral-800 px-6 md:px-10">
      <div className="mx-auto flex max-w-4xl items-center gap-8 py-4">
        <span className="text-xs font-semibold tracking-widest text-neutral-50">
          MONVO
        </span>
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`text-sm transition-colors ${
                pathname === tab.href
                  ? "font-medium text-neutral-50"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
