"use client";
import Link from "next/link";
import { Globe2, Landmark } from "lucide-react";
import { useMarket } from "@/lib/hooks";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MarketOverview() {
  const { data, isLoading } = useMarket();
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const m = data.macro;
  const arrow = (t: string) => (t === "rising" ? "↑ stijgend" : t === "falling" ? "↓ dalend" : "→ stabiel");
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardBody>
            <FearGreedGauge data={data.stockFearGreed} title="Aandelen Fear & Greed" />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <FearGreedGauge data={data.cryptoFearGreed} title="Crypto Fear & Greed" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Landmark className="h-4 w-4" />} title="Macro-omgeving" action={<Badge tone={m.source === "mock" ? "hold" : "bull"}>{m.source}</Badge>} />
          <CardBody className="grid grid-cols-2 gap-2">
            {[
              ["Fed Funds rente", m.fedFundsRate !== null ? `${m.fedFundsRate.toFixed(2)}%` : "—", arrow(m.rateTrend)],
              ["Inflatie (CPI YoY)", m.inflationYoY !== null ? `${m.inflationYoY.toFixed(1)}%` : "—", arrow(m.inflationTrend)],
              ["US 10j rente", m.us10y !== null ? `${m.us10y.toFixed(2)}%` : "—", ""],
              ["BTC dominantie", m.btcDominance !== null ? `${m.btcDominance.toFixed(1)}%` : "—", "aandeel van Bitcoin"],
            ].map(([l, v, s]) => (
              <div key={l} className="rounded-lg bg-panel-2 p-3">
                <div className="text-[11px] text-muted">{l}</div>
                <div className="font-mono text-lg font-semibold tabular">{v}</div>
                <div className="text-[11px] text-muted">{s}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader icon={<Globe2 className="h-4 w-4" />} title="Markten" subtitle="Klik voor de volledige 4-pijler analyse" />
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
          {data.movers.map((q) => {
            const up = q.changePct24h >= 0;
            return (
              <Link key={`${q.type}:${q.symbol}`} href={`/asset/${q.type}/${q.symbol}`} className="bg-panel p-3 transition-colors hover:bg-panel-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{q.symbol}</span>
                  <span className={cn("font-mono text-xs tabular", up ? "text-bull" : "text-bear")}>{formatPct(q.changePct24h / 100, 2, true)}</span>
                </div>
                <div className="truncate text-[11px] text-muted">
                  {q.name}
                  {q.source === "mock" && <span className="ml-1 text-hold">· mock</span>}
                </div>
                <div className="mt-1 font-mono text-sm tabular">{formatPrice(q.price, q.currency)}</div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
