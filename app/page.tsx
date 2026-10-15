import { MarketOverview } from "@/components/dashboard/MarketOverview";
import { WatchlistPanel } from "@/components/dashboard/WatchlistPanel";
import { SearchBar } from "@/components/SearchBar";
import Link from "next/link";

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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-panel to-bg px-4 py-8 text-center sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          Analyseer elk aandeel of crypto in <span className="text-bull">seconden</span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
          4-pijler diepte-analyse (fundamenteel, technisch, sentiment, risico), een transparante AI-beslissingsmatrix met
          concreet executieplan, en een backtest over de afgelopen 12 maanden.
        </p>
        <div className="mt-6">
          <SearchBar large />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {QUICK.map((q) => (
            <Link
              key={q.s}
              href={`/asset/${q.t}/${q.s}`}
              className="rounded-full border border-border bg-panel px-3 py-1 font-mono text-xs hover:border-accent/60 hover:text-accent"
            >
              {q.s}
            </Link>
          ))}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <MarketOverview />
        <WatchlistPanel />
      </div>
    </div>
  );
}
