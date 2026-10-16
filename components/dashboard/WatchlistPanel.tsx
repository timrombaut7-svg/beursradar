"use client";
import Link from "next/link";
import { Star, X } from "lucide-react";
import { useHydrated } from "@/lib/useHydrated";
import { useWatchlist } from "@/lib/store/watchlist";
import { useQuotes } from "@/lib/hooks";
import { Card, CardHeader } from "@/components/ui/card";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StorageLabel } from "@/components/StorageBadge";

export function WatchlistPanel() {
  const { items, remove } = useWatchlist();
  // Voorkom hydration-mismatch: localStorage is pas client-side beschikbaar
  const hydrated = useHydrated();
  const list = hydrated ? items : [];
  const { data: quotes = [] } = useQuotes(list.map((i) => ({ symbol: i.symbol, type: i.type })));

  return (
    <Card>
      <CardHeader icon={<Star className="h-4 w-4" />} title="Watchlist" subtitle={<>{list.length} assets · <StorageLabel /></>} />
      {list.length === 0 && <p className="p-4 text-sm text-muted">Nog leeg. Klik op ★ bij een asset om hem toe te voegen.</p>}
      <ul className="divide-y divide-border">
        {list.map((i) => {
          const q = quotes.find((x) => x.symbol === i.symbol && x.type === i.type);
          const up = (q?.changePct24h ?? 0) >= 0;
          return (
            <li key={`${i.type}:${i.symbol}`} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-panel-2">
              <Link href={`/asset/${i.type}/${i.symbol}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="w-16 font-mono font-semibold">{i.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">
                  {i.name}
                  {q?.source === "mock" && <span className="ml-1 text-hold">· mock</span>}
                </span>
                <span className="text-right">
                  <span className="block font-mono text-sm tabular">{q ? formatPrice(q.price, q.currency) : "…"}</span>
                  {q && <span className={cn("block font-mono text-[11px] tabular", up ? "text-bull" : "text-bear")}>{formatPct(q.changePct24h / 100, 2, true)}</span>}
                </span>
              </Link>
              <button aria-label={`Verwijder ${i.symbol}`} onClick={() => remove(i.symbol, i.type)} className="rounded p-1 text-muted opacity-0 hover:text-bear group-hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
