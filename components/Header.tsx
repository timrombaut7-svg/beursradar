"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Briefcase, LayoutDashboard, Lightbulb, Moon, Sparkles, Sun, Wallet } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { AccountButton } from "./account/AccountButton";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/kansen", label: "Kansen", icon: Lightbulb },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/quiz", label: "Quiz", icon: Brain },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/assistent", label: "AI", icon: Sparkles },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useUi();
  if (pathname === "/login") return null;
  return (
    <header className="glass sticky top-0 z-40 border-b border-border/60">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element -- klein SVG-logo, geen optimalisatie nodig */}
          <img src="/icon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px] shadow-[0_0_20px_-6px] shadow-bull/70" />
          <span className="hidden sm:inline">
            Beurs<span className="text-gradient">radar</span>
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-panel-2 hover:text-text",
                isActive(pathname, href) && "bg-panel-2 text-text ring-1 ring-border",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <AccountButton active={isActive(pathname, "/account")} />
        <button
          aria-label="Wissel thema"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl p-2 text-muted hover:bg-panel-2 hover:text-text"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

/** Menubalk onderaan op de telefoon, zoals in een echte app. */
export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <nav
      aria-label="Hoofdmenu"
      className="glass glass-solid fixed inset-x-0 bottom-0 z-40 border-t border-border/60 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-6">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors",
                active ? "text-bull" : "text-muted",
              )}
            >
              <span className={cn("grid h-7 w-11 place-items-center rounded-full transition-colors", active && "bg-bull/15")}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
