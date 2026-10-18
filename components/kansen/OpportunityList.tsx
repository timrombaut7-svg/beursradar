"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import type { AssetType, Horizon, LivePrice, Opportunity } from "@/types";
import { useLivePrices, useScan } from "@/lib/hooks";
import { useNow, secondsAgo } from "@/lib/useNow";
import { LiveDot, LivePriceValue, MarketStateTag } from "@/components/LivePrice";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ADVICE_META, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BuyDialog } from "./BuyDialog";
import { Explanation } from "./Explanation";
import { EvidenceBox } from "./EvidenceBox";
import { rejectionReason } from "@/lib/evidenceText";

const HORIZONS: { key: Horizon; label: string; sub: string }[] = [
  { key: "short", label: "Korte termijn", sub: "weken" },
  { key: "long", label: "Lange termijn", sub: "maanden tot jaren" },
];
type Filter = "all" | "stock" | "etf" | "crypto";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alles" },
  { key: "stock", label: "Aandelen" },
  { key: "etf", label: "ETF's" },
  { key: "crypto", label: "Crypto" },
];
const FILTER_NL: Record<Exclude<Filter, "all">, string> = { stock: "geen enkel aandeel", etf: "geen enkele ETF", crypto: "geen enkele crypto" };

/** Hoort deze asset bij het gekozen filter? ETF's tellen niet als losse aandelen. */
const matches = (filter: Filter, a: { type: AssetType; etf: boolean }) =>
  filter === "all" || (filter === "etf" ? a.etf : filter === "stock" ? a.type === "stock" && !a.etf : a.type === filter);

export function OpportunityList() {
  const { data, isLoading, isError, error, refetch, isFetching } = useScan();
  const { data: live } = useLivePrices();
  const now = useNow(5000);
  const [horizon, setHorizon] = useState<Horizon>("short");
  const [filter, setFilter] = useState<Filter>("all");

  const all = data ? (horizon === "short" ? data.short : data.long) : [];
  const list = all.filter((o) => matches(filter, o.row));
  const rejected = (data?.rejected[horizon] ?? []).filter((r) => matches(filter, r));
  const count = (h: Horizon) => (data ? (h === "short" ? data.short : data.long).length : 0);

  return (
    <Card>
      <CardHeader
        icon={<TrendingUp className="h-4 w-4" />}
        title="Nu slim om te kopen"
        subtitle={
          data ? (
            <span>
              <LiveDot active={Boolean(live?.prices.length)} /> {data.scanned} aandelen, ETF&apos;s en crypto geanalyseerd · signalen{" "}
              {secondsAgo(data.generatedAt, now)}
              {live?.prices.length ? ` · koersen ${secondsAgo(live.generatedAt, now)}` : ""}
            </span>
          ) : (
            "Alle aandelen, ETF's en crypto worden geanalyseerd…"
          )
        }
        action={
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} aria-label="Ververs">
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        }
      />
      <div className="space-y-2 border-b border-border p-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-panel-2 p-1" role="tablist" aria-label="Termijn">
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              role="tab"
              aria-selected={horizon === h.key}
              onClick={() => setHorizon(h.key)}
              className={cn(
                "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                horizon === h.key ? "bg-panel text-text shadow-sm" : "text-muted hover:text-text",
              )}
            >
              <span className="font-medium">{h.label}</span> <span className="text-xs text-muted">({count(h.key)})</span>
              <span className="block text-[11px] text-muted">houden: {h.sub}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Soort">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                filter === f.key ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-text",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2 p-4">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Bezig met analyseren. De eerste keer kan dit even duren.
          </p>
          <Skeleton className="h-40" />
        </div>
      )}
      {isError && <p className="p-4 text-sm text-bear">Scan mislukt: {(error as Error).message}</p>}
      {data && list.length === 0 && (
        <p className="p-4 text-sm text-muted">
          {filter !== "all"
            ? `Op dit moment geeft ${FILTER_NL[filter]} een koopsignaal voor de ${horizon === "short" ? "korte" : "lange"} termijn dat de historische toets doorstaat.`
            : "Op dit moment is er niets met een koopsignaal dat de historische toets doorstaat."}{" "}
          {horizon === "short" ? "Kijk ook bij Lange termijn." : "Kijk ook bij Korte termijn."} Liever geen tip dan een slechte tip.
        </p>
      )}
      <ul className="divide-y divide-border">
        {list.map((o) => (
          <OpportunityCard key={`${o.horizon}:${o.row.type}:${o.row.symbol}`} o={o} lp={live?.prices.find((x) => x.symbol === o.row.symbol && x.type === o.row.type)} />
        ))}
      </ul>
      {rejected.length > 0 && (
        <details className="border-t border-border p-4 text-sm">
          <summary className="cursor-pointer text-muted hover:text-text">
            {rejected.length} {rejected.length === 1 ? "ander koopsignaal" : "andere koopsignalen"} weggelaten na de historische toets
          </summary>
          <p className="mt-2 text-xs text-muted">
            Deze gaven nu wel een koopsignaal, maar hetzelfde signaal leverde in het verleden op dit aandeel of deze crypto
            niet genoeg op. Daarom raden we ze niet aan.
          </p>
          <ul className="mt-2 space-y-1">
            {rejected.map((r) => (
              <li key={`${r.type}:${r.symbol}`} className="flex flex-wrap gap-x-2">
                <Link href={`/asset/${r.type}/${r.symbol}`} className="font-mono font-semibold hover:text-accent">
                  {r.symbol}
                </Link>
                <span className="text-muted">{rejectionReason(r.evidence)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function OpportunityCard({ o, lp }: { o: Opportunity; lp: LivePrice | undefined }) {
  const r = o.row;
  const p = o.plan;
  const meta = ADVICE_META[o.advice];
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/asset/${r.type}/${r.symbol}`} className="font-mono text-lg font-bold hover:text-accent">
              {r.symbol}
            </Link>
            <Badge tone="bull">{meta.nl}</Badge>
            <Badge tone={r.type === "crypto" ? "hold" : r.etf ? "neutral" : "accent"}>{r.type === "crypto" ? "crypto" : r.etf ? "ETF" : "aandeel"}</Badge>
            {r.mockSources.length > 0 && <Badge tone="hold" title={`Niet live: ${r.mockSources.join(", ")}`}>{r.mockSources.join(", ")}: mock</Badge>}
          </div>
          <p className="truncate text-xs text-muted">{r.name}</p>
          {o.alternatives?.length ? (
            <p className="text-[11px] text-muted">Zelfde index, ook goed: {o.alternatives.join(" · ")}</p>
          ) : null}
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <LivePriceValue price={lp?.price ?? r.price} currency={r.currency} changePct={lp?.changePct ?? r.changePct24h} />
            {lp && <MarketStateTag state={lp.marketState} />}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            <CalendarClock className="h-3.5 w-3.5" /> Houden: {o.hold.label}
          </span>
          <div className="flex gap-2">
            <BuyDialog opportunity={o} />
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/asset/${r.type}/${r.symbol}`}>Analyse</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Level label="Kopen tussen" value={`${formatPrice(p.entryLow, r.currency)} – ${formatPrice(p.entryHigh, r.currency)}`} className="col-span-2 sm:col-span-1" />
        <Level label="Verkopen onder" value={formatPrice(p.stopLoss, r.currency)} tone="text-bear" />
        {p.target1 && p.target2 ? (
          <>
            <Level label="Eerste doel" value={formatPrice(p.target1, r.currency)} tone="text-bull" />
            <Level label="Tweede doel" value={formatPrice(p.target2, r.currency)} tone="text-bull" />
          </>
        ) : (
          <Level label="Koersdoel" value="geen vast doel" className="col-span-1 sm:col-span-2" />
        )}
      </div>

      <EvidenceBox evidence={o.row.evidence[o.horizon]} horizon={o.horizon} />
      <Explanation explanation={o.explanation} />
    </li>
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
