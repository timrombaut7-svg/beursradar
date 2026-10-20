"use client";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Gauge, Landmark, Lightbulb, Newspaper as NewspaperIcon, RefreshCw } from "lucide-react";
import type { FearGreed, Mover, NewsItem, Newspaper } from "@/types";
import { useNewspaper, useScan } from "@/lib/hooks";
import { ADVICE_META, formatPrice, timeAgo } from "@/lib/format";
import { dayKey, quizForDay } from "@/lib/quiz/questions";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TermLabel } from "@/components/TermLabel";
import { cn } from "@/lib/utils";

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2).replace(".", ",")}%`;
const tone = (v: number) => (v > 0.05 ? "text-bull" : v < -0.05 ? "text-bear" : "text-muted");

function tickPrice(price: number, currency: string, group: string) {
  if (group === "fx") return price.toFixed(4).replace(".", ",");
  if (group === "index") return price.toLocaleString("nl-NL", { maximumFractionDigits: 0 });
  return formatPrice(price, currency);
}

export function KrantView() {
  const { data: k, isLoading, isError, refetch, isFetching } = useNewspaper();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (isError || !k) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="mb-4 text-sm text-muted">De krant kon niet geladen worden.</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Opnieuw proberen
        </Button>
      </div>
    );
  }

  const date = new Date(k.generatedAt);
  const dateLine = date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Kop van de krant */}
      <header className="border-y-4 border-double border-border py-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted">Elke minuut de nieuwste editie</p>
        <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight sm:text-6xl">De Beurskrant</h1>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 text-xs text-muted">
          <span>{dateLine.charAt(0).toUpperCase() + dateLine.slice(1)}</span>
          <span>·</span>
          <span>editie {time}</span>
          <span>·</span>
          <span className={k.live ? "text-bull" : "text-hold"}>{k.live ? "live koersen" : "koersen even niet bereikbaar"}</span>
          <button onClick={() => refetch()} disabled={isFetching} aria-label="Ververs de krant" className="ml-1 rounded p-1 hover:text-text">
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </button>
        </p>
      </header>

      <MarketStrip k={k} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <LeadStory k={k} />
          <NewsSection title="Nieuws uit Nederland" subtitle="Economie · NOS" items={k.news.nl} featured />
          <NewsSection title="Wall Street & de wereld" subtitle="Engelstalig" items={k.news.world} />
          <NewsSection title="Crypto-nieuws" subtitle="Engelstalig" items={k.news.crypto} />
          {!k.news.live && <p className="text-center text-xs text-hold">Het nieuws is even niet bereikbaar; dit zijn voorbeeldberichten.</p>}
        </div>
        <aside className="min-w-0 space-y-4">
          <Movers up={k.movers.up} down={k.movers.down} />
          <Mood stock={k.fearGreed.stock} crypto={k.fearGreed.crypto} />
          <Economy k={k} />
          <TodaysTips />
          <FactOfTheDay />
        </aside>
      </div>
    </div>
  );
}

function MarketStrip({ k }: { k: Newspaper }) {
  if (!k.markets.length) return null;
  return (
    <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-5">
        {k.markets.map((m) => (
          <div key={m.symbol} className="rounded-xl border border-border bg-panel/80 px-3 py-2">
            <div className="text-[11px] text-muted">{m.name}</div>
            <div className="font-mono text-sm font-semibold tabular">{tickPrice(m.price, m.currency, m.group)}</div>
            <div className={cn("font-mono text-xs tabular", tone(m.changePct))}>{pct(m.changePct)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadStory({ k }: { k: Newspaper }) {
  const { lead } = k;
  return (
    <Card className="p-5 sm:p-6">
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", lead.tone === "bull" ? "text-bull" : lead.tone === "bear" ? "text-bear" : "text-accent")}>
        Hoofdartikel
      </p>
      <h2 className="mt-1 font-serif text-2xl font-bold leading-tight sm:text-4xl">{lead.headline}</h2>
      <p className="mt-3 font-serif text-base font-semibold leading-relaxed sm:text-lg">{lead.intro}</p>
      <div className="mt-3 space-y-2 font-serif text-[15px] leading-relaxed text-text/90 sm:columns-2 sm:gap-6 sm:space-y-0">
        {lead.paragraphs.map((p) => (
          <p key={p} className="sm:mb-2 sm:break-inside-avoid">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
        <p className="font-semibold text-accent">Wat betekent dit voor jou?</p>
        <p className="mt-1 leading-relaxed">{lead.takeaway}</p>
      </div>
    </Card>
  );
}

function NewsSection({ title, subtitle, items, featured }: { title: string; subtitle: string; items: NewsItem[]; featured?: boolean }) {
  if (!items.length) return null;
  const [first, ...rest] = items;
  return (
    <Card>
      <CardHeader icon={<NewspaperIcon className="h-4 w-4" />} title={title} subtitle={subtitle} />
      <ul className="divide-y divide-border">
        {featured && first && (
          <li className="p-4">
            <NewsLink n={first} big />
          </li>
        )}
        {(featured ? rest : items).map((n) => (
          <li key={n.id} className="px-4 py-3">
            <NewsLink n={n} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NewsLink({ n, big }: { n: NewsItem; big?: boolean }) {
  const dot = n.sentiment === "bullish" ? "bg-bull" : n.sentiment === "bearish" ? "bg-bear" : "bg-muted/50";
  return (
    <a href={n.url} target="_blank" rel="noopener noreferrer" className="group block space-y-1">
      <span className={cn("flex items-start gap-2 font-serif font-semibold leading-snug group-hover:text-accent", big ? "text-xl" : "text-[15px]")}>
        {n.title}
        <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      {n.summary && <span className={cn("block text-sm text-muted", big ? "line-clamp-3" : "line-clamp-2")}>{n.summary}</span>}
      <span className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {n.publisher} · {timeAgo(n.publishedAt)}
      </span>
    </a>
  );
}

function Movers({ up, down }: { up: Mover[]; down: Mover[] }) {
  if (!up.length && !down.length) return null;
  const list = (rows: Mover[], icon: React.ReactNode, label: string) => (
    <div>
      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon} {label}
      </p>
      <ul className="space-y-1">
        {rows.map((m) => (
          <li key={`${m.type}:${m.symbol}`}>
            <Link href={`/asset/${m.type}/${m.symbol}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel-2">
              <span className="min-w-0 truncate">
                <span className="font-mono text-xs font-semibold">{m.symbol}</span> <span className="text-muted">{m.name}</span>
              </span>
              <span className={cn("shrink-0 font-mono text-xs font-semibold tabular", tone(m.changePct))}>{pct(m.changePct)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <Card>
      <CardHeader icon={<ArrowUpRight className="h-4 w-4" />} title="Stijgers & dalers" subtitle="Van vandaag, uit alle aandelen en crypto in de app" />
      <div className="space-y-3 p-3">
        {up.length > 0 && list(up, <ArrowUpRight className="h-3.5 w-3.5 text-bull" />, "Grootste stijgers")}
        {down.length > 0 && list(down, <ArrowDownRight className="h-3.5 w-3.5 text-bear" />, "Grootste dalers")}
      </div>
    </Card>
  );
}

function Mood({ stock, crypto }: { stock: FearGreed; crypto: FearGreed }) {
  const bar = (label: string, fg: FearGreed) => (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono font-semibold tabular">
          {fg.value} <span className="text-xs font-normal text-muted">{fg.label}</span>
        </span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-gradient-to-r from-bear via-hold to-bull">
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-text" style={{ left: `${fg.value}%` }} />
      </div>
    </div>
  );
  return (
    <Card>
      <CardHeader icon={<Gauge className="h-4 w-4" />} title={<TermLabel label="Fear & Greed" />} subtitle="De stemming: 0 = extreme angst, 100 = extreme hebzucht" />
      <div className="space-y-4 p-4">
        {bar("Aandelen", stock)}
        {bar("Crypto", crypto)}
      </div>
    </Card>
  );
}

function Economy({ k }: { k: Newspaper }) {
  const m = k.macro;
  const arrow = (t: "rising" | "falling" | "stable") => (t === "rising" ? "↑" : t === "falling" ? "↓" : "→");
  const rows = [
    { label: "Fed rente", value: m.fedFundsRate !== null ? `${m.fedFundsRate.toFixed(2).replace(".", ",")}% ${arrow(m.rateTrend)}` : null },
    { label: "Inflatie (CPI)", value: m.inflationYoY !== null ? `${m.inflationYoY.toFixed(1).replace(".", ",")}% ${arrow(m.inflationTrend)}` : null },
    { label: "US 10j rente", value: m.us10y !== null ? `${m.us10y.toFixed(2).replace(".", ",")}%` : null },
    { label: "BTC dominantie", value: m.btcDominance !== null ? `${m.btcDominance.toFixed(1).replace(".", ",")}%` : null },
  ].filter((r) => r.value);
  if (!rows.length) return null;
  return (
    <Card>
      <CardHeader icon={<Landmark className="h-4 w-4" />} title="Economie" subtitle={m.source === "live" ? "Officiële cijfers (FRED)" : "Voorbeeldcijfers"} />
      <dl className="grid grid-cols-2 gap-2 p-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-panel-2 px-3 py-2">
            <dt className="text-[11px] text-muted">
              <TermLabel label={r.label} />
            </dt>
            <dd className="font-mono text-sm font-semibold tabular">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function TodaysTips() {
  const { data } = useScan();
  const tips = [...(data?.short ?? []), ...(data?.long ?? [])]
    .sort((a, b) => b.score - a.score)
    .filter((o, i, all) => all.findIndex((x) => x.row.symbol === o.row.symbol && x.row.type === o.row.type) === i)
    .slice(0, 4);
  return (
    <Card>
      <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="Kansen van vandaag" subtitle="Alleen signalen die de historische toets halen" />
      {tips.length === 0 ? (
        <p className="p-4 text-sm text-muted">{data ? "Op dit moment geen bewezen koopkansen. Geduld is ook een strategie." : "Kansen laden…"}</p>
      ) : (
        <ul className="space-y-1 p-3">
          {tips.map((o) => (
            <li key={`${o.horizon}:${o.row.type}:${o.row.symbol}`}>
              <Link href={`/asset/${o.row.type}/${o.row.symbol}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel-2">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs font-semibold">{o.row.symbol}</span> <span className="text-muted">{o.row.name}</span>
                </span>
                <span className="shrink-0 text-right text-[11px]">
                  <span className="block font-semibold text-bull">{ADVICE_META[o.advice].nl}</span>
                  <span className="text-muted">{o.horizon === "short" ? "korte termijn" : "lange termijn"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/kansen" className="block border-t border-border px-4 py-2 text-xs font-medium text-accent hover:underline">
        Alle kansen bekijken →
      </Link>
    </Card>
  );
}

function FactOfTheDay() {
  const q = quizForDay(dayKey()).items[0]?.question;
  if (!q) return null;
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-hold">Weetje van de dag</p>
      <p className="mt-1 font-serif text-[15px] leading-relaxed">{q.fact}</p>
      <Link href="/quiz" className="mt-2 inline-block text-xs font-medium text-accent hover:underline">
        Doe de quiz van vandaag →
      </Link>
    </Card>
  );
}
