"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Briefcase, LayoutDashboard, Lightbulb, Moon, Sun } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kansen", label: "Kansen", icon: Lightbulb },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useUi();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-bull/15 text-bull">
            <Activity className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">
            Beurs<span className="text-bull">radar</span>
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-panel-2 hover:text-text",
                pathname === href && "bg-panel-2 text-text",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
          <button
            aria-label="Wissel thema"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-text"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
}
