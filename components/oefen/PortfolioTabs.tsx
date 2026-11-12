"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Briefcase, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/portfolio", label: "Mijn portfolio", icon: Briefcase },
  { href: "/spel", label: "€100k-spel", icon: Gamepad2 },
  { href: "/bot", label: "Trading bot", icon: Bot },
];

/** Wisselen tussen je echte portfolio, het €100.000-spel en de trading bot. */
export function PortfolioTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Portfolio's" className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-panel/80 p-1">
      {TABS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
            pathname === href ? "bg-panel-2 text-text ring-1 ring-border" : "text-muted hover:text-text",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
