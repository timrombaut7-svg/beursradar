import Link from "next/link";
import { Brain, Lightbulb, Sparkles, Wallet } from "lucide-react";
import { MarketOverview } from "@/components/dashboard/MarketOverview";
import { WatchlistPanel } from "@/components/dashboard/WatchlistPanel";
import { DailyQuiz } from "@/components/quiz/DailyQuiz";
import { SearchBar } from "@/components/SearchBar";

const QUICK = [
  { s: "NVDA", t: "stock" },
  { s: "AAPL", t: "stock" },
  { s: "ASML", t: "stock" },
  { s: "TSLA", t: "stock" },
  { s: "BTC", t: "crypto" },
  { s: "ETH", t: "crypto" },
  { s: "SOL", t: "crypto" },
  { s: "XRP", t: "crypto" },
];

const SHORTCUTS = [
  { href: "/kansen", label: "Kansen", sub: "Wat nu slim is om te kopen", icon: Lightbulb, tone: "from-bull/25 text-bull" },
  { href: "/budget", label: "Budget", sub: "Hoe verdeel ik mijn geld?", icon: Wallet, tone: "from-accent/25 text-accent" },
  { href: "/assistent", label: "Vraag de AI", sub: "Stijgt of daalt het?", icon: Sparkles, tone: "from-accent/25 text-accent" },
  { href: "/quiz", label: "Quiz", sub: "Elke dag een weetje", icon: Brain, tone: "from-hold/25 text-hold" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <section className="hero-surface relative overflow-hidden rounded-3xl border border-border/80 px-4 py-7 text-center sm:py-12">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-bull/30 bg-bull/10 px-3 py-1 text-[11px] font-medium text-bull">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bull" /> Live koersen · aandelen & crypto
        </span>
        <h1 className="mt-3 text-[1.7rem] font-bold leading-tight tracking-tight sm:text-5xl">
          Slimmer beleggen, <span className="text-gradient">in gewone taal</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Zoek een aandeel of crypto en zie meteen of het een koop- of verkoopmoment is, met uitleg die iedereen snapt.
        </p>
        <div className="mx-auto mt-5 max-w-2xl">
          <SearchBar large />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {QUICK.map((q) => (
            <Link
              key={q.s}
              href={`/asset/${q.t}/${q.s}`}
              className="rounded-full border border-border bg-panel/70 px-3 py-1 font-mono text-xs transition-colors hover:border-bull/60 hover:text-bull"
            >
              {q.s}
            </Link>
          ))}
        </div>
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-2 text-left sm:grid-cols-4">
          {SHORTCUTS.map(({ href, label, sub, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-border/80 bg-panel/70 p-3 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-panel"
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br to-transparent ${tone}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="mt-2 text-sm font-semibold">{label}</div>
              <div className="hidden text-[11px] text-muted sm:block">{sub}</div>
            </Link>
          ))}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[auto_1fr] [&>*]:min-w-0">
        <div className="xl:col-start-2 xl:row-start-1">
          <DailyQuiz compact />
        </div>
        <div className="xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <MarketOverview />
        </div>
        <div className="self-start xl:col-start-2 xl:row-start-2">
          <WatchlistPanel />
        </div>
      </div>
    </div>
  );
}
