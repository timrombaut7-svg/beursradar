"use client";
import Link from "next/link";
import { Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { useLivePrices, useScan } from "@/lib/hooks";
import { useNow, secondsAgo } from "@/lib/useNow";
import { LiveDot, LivePriceValue, MarketStateTag } from "@/components/LivePrice";
import { Explanation } from "./Explanation";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ADVICE_META, formatPrice } from "@/lib/format";
import { BuyDialog } from "./BuyDialog";

export function OpportunityList() {
  const { data, isLoading, isError, error, refetch, isFetching } = useScan();
  const { data: live } = useLivePrices();
  const now = useNow(5000);

  return (
    <Card>
      <CardHeader
        icon={<TrendingUp className="h-4 w-4" />}
        title="Nu slim om te kopen"
        subtitle={
          data ? (
            <span>
              <LiveDot active={Boolean(live?.prices.length)} />{" "}
              <span>
                {data.opportunities.length} kansen uit {data.scanned} assets · signalen {secondsAgo(data.generatedAt, now)}
                {live?.prices.length ? ` · koersen ${secondsAgo(live.generatedAt, now)}` : ""}
              </span>
            </span>
          ) : (
            "Alle aandelen en crypto in de catalogus worden geanalyseerd…"
          )
        }
        action={
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} aria-label="Ververs">
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        }
      />
      {isLoading && (
        <div className="space-y-2 p-4">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Bezig met analyseren. De eerste keer kan dit tot een halve minuut duren.
          </p>
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {isError && <p className="p-4 text-sm text-bear">Scan mislukt: {(error as Error).message}</p>}
      {data && data.opportunities.length === 0 && (
        <p className="p-4 text-sm text-muted">Op dit moment geeft geen enkele asset een koopsignaal. Kom later terug.</p>
      )}
      <ul className="divide-y divide-border">
        {data?.opportunities.map((r) => {
          const meta = ADVICE_META[r.shortTerm.advice];
          const p = r.tradePlan;
          const lp = live?.prices.find((x) => x.symbol === r.symbol && x.type === r.type);
          return (
            <li key={`${r.type}:${r.symbol}`} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/asset/${r.type}/${r.symbol}`} className="font-mono text-lg font-bold hover:text-accent">
                    {r.symbol}
                  </Link>
                  <Badge tone="bull">{meta.nl}</Badge>
                  <span className="font-mono text-xs text-bull">+{r.shortTerm.score}</span>
                  {r.mockSources.length > 0 && (
                    <Badge tone="hold" title={`Niet live: ${r.mockSources.join(", ")}`}>
                      {r.mockSources.join(", ")}: mock
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted">
                  {r.name} · {r.type === "crypto" ? "crypto" : "aandeel"} · betrouwbaarheid {r.shortTerm.confidence}%
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <LivePriceValue price={lp?.price ?? r.price} currency={r.currency} changePct={lp?.changePct ?? r.changePct24h} />
                  {lp && <MarketStateTag state={lp.marketState} />}
                </p>
              </div>
              <div className="min-w-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Level
                    label="Instapzone"
                    value={`${formatPrice(p.entryLow, r.currency)} – ${formatPrice(p.entryHigh, r.currency)}`}
                    className="col-span-2 sm:col-span-1"
                  />
                  <Level label="Stop-loss" value={formatPrice(p.stopLoss, r.currency)} tone="text-bear" />
                  <Level label="Koersdoel 1" value={formatPrice(p.target1, r.currency)} tone="text-bull" />
                  <Level label={`Koersdoel 2 · risico/rendement 1:${p.riskReward2.toFixed(1)}`} value={formatPrice(p.target2, r.currency)} tone="text-bull" />
                </div>
                <Explanation explanation={r.explanation} />
              </div>
              <div className="flex gap-2 lg:flex-col lg:items-stretch">
                <BuyDialog row={r} />
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/asset/${r.type}/${r.symbol}`}>Analyse</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Level({ label, value, tone, className }: { label: string; value: string; tone?: string; className?: string }) {
  return (
    <div className={`rounded-lg bg-panel-2 px-2 py-1.5 ${className ?? ""}`}>
      <div className="text-[10px] text-muted">{label}</div>
      <div className={`truncate font-mono tabular ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
