"use client";
import { useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { Activity, BarChart3, Gauge, Newspaper, ShieldAlert } from "lucide-react";
import type { Analysis, Pillar } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FactorList } from "./FactorList";
import { PILLAR_NL } from "./DecisionBanner";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { NewsFeed } from "./NewsFeed";
import { formatCompact, formatNumber, formatPct, formatPrice, TONE_TEXT, toneOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const ORDER: Pillar[] = ["fundamental", "technical", "sentiment", "risk"];
const ICONS = { fundamental: BarChart3, technical: Activity, sentiment: Newspaper, risk: ShieldAlert };

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-panel-2 px-3 py-2" title={hint}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-mono text-sm font-semibold tabular">{value}</div>
    </div>
  );
}

function Fundamentals({ a }: { a: Analysis }) {
  const f = a.fundamentals;
  const cur = a.asset.currency;
  if (f.kind === "stock") {
    const an = f.analyst;
    const total = an.strongBuy + an.buy + an.hold + an.sell + an.strongSell;
    return (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="P/E (trailing)" value={formatNumber(f.peRatio, 1)} />
          <Metric label="Forward P/E" value={formatNumber(f.forwardPe, 1)} />
          <Metric label="PEG ratio" value={formatNumber(f.pegRatio, 2)} />
          <Metric label="EPS" value={formatPrice(f.eps, cur)} />
          <Metric label="Omzetgroei YoY" value={formatPct(f.revenueGrowthYoY, 1, true)} />
          <Metric label="Schuld / EV" value={f.debtToEquity !== null ? `${formatNumber(f.debtToEquity / 100, 2)}x` : "—"} />
          <Metric label="Free Cash Flow" value={formatCompact(f.freeCashFlow)} />
          <Metric label="Dividendrendement" value={formatPct(f.dividendYield, 2)} />
          <Metric label="Winstmarge" value={formatPct(f.profitMargin, 1)} />
          <Metric label="Marktkapitalisatie" value={formatCompact(f.marketCap)} />
          <Metric label="Sector" value={f.sector ?? "—"} />
          <Metric label="Koersdoel analisten" value={formatPrice(an.targetMeanPrice, cur)} />
        </div>
        {total > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-muted">Analisten-consensus ({total})</p>
            <div className="flex h-3 overflow-hidden rounded-full">
              {[
                [an.strongBuy, "bg-bull"],
                [an.buy, "bg-bull/60"],
                [an.hold, "bg-hold"],
                [an.sell, "bg-bear/60"],
                [an.strongSell, "bg-bear"],
              ].map(([n, cls], i) => (
                <div key={i} className={cls as string} style={{ width: `${((n as number) / total) * 100}%` }} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted">
              <span>Strong buy {an.strongBuy}</span>
              <span>Buy {an.buy}</span>
              <span>Hold {an.hold}</span>
              <span>Sell {an.sell + an.strongSell}</span>
            </div>
          </div>
        )}
      </>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label="Marktkapitalisatie" value={formatCompact(f.marketCap)} />
      <Metric label="FDV" value={formatCompact(f.fullyDilutedValuation)} />
      <Metric label="Rang" value={f.marketCapRank ? `#${f.marketCapRank}` : "—"} />
      <Metric label="TVL" value={formatCompact(f.totalValueLocked)} />
      <Metric label="Circulerend" value={formatCompact(f.circulatingSupply)} />
      <Metric label="Max supply" value={f.maxSupply ? formatCompact(f.maxSupply) : "∞"} />
      <Metric label="Circ. / Max" value={formatPct(f.supplyRatio, 1)} />
      <Metric label="Inflatie p.j." value={formatPct(f.annualInflation, 2)} hint="Indicatieve netto uitgifte" />
      <Metric label="MVRV Z (proxy)" value={formatNumber(f.mvrvZScore, 2)} hint="(prijs − 365d gem.) / σ — benadering van MVRV Z-score" />
      <Metric label="Van ATH" value={f.athChangePct !== null ? formatPct(f.athChangePct / 100, 1) : "—"} />
      <Metric
        label="Actieve adressen"
        value={formatCompact(f.network.activeAddresses)}
        hint={f.network.source === "mock" ? "Geschat (on-chain API vereist)" : undefined}
      />
      <Metric label="Tx-volume / dag" value={`$${formatCompact(f.network.dailyTxVolumeUsd)}`} />
    </div>
  );
}

function Technical({ a }: { a: Analysis }) {
  const t = a.technical;
  const cur = a.asset.currency;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label="EMA 20" value={formatPrice(t.ema20, cur)} />
      <Metric label="EMA 50" value={formatPrice(t.ema50, cur)} />
      <Metric label="EMA 200" value={formatPrice(t.ema200, cur)} />
      <Metric label="ATR (14)" value={formatPrice(t.atr, cur)} />
      <Metric label="BB boven" value={formatPrice(t.bollinger?.upper, cur)} />
      <Metric label="BB onder" value={formatPrice(t.bollinger?.lower, cur)} />
      <Metric label="52w hoog" value={formatPrice(t.high52w, cur)} />
      <Metric label="52w laag" value={formatPrice(t.low52w, cur)} />
      {t.fibonacci && (
        <div className="col-span-2 rounded-lg bg-panel-2 px-3 py-2 sm:col-span-4">
          <div className="mb-1 text-[11px] text-muted">
            Fibonacci ({t.fibonacci.trend === "up" ? "opwaartse" : "neerwaartse"} swing {formatPrice(t.fibonacci.swingLow, cur)} → {formatPrice(t.fibonacci.swingHigh, cur)})
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular">
            {t.fibonacci.retracements.map((r) => (
              <span key={r.ratio}>
                <span className="text-muted">{r.ratio}</span> {formatPrice(r.price, cur)}
              </span>
            ))}
            {t.fibonacci.extensions.map((r) => (
              <span key={r.ratio} className="text-accent">
                <span className="opacity-70">{r.ratio}</span> {formatPrice(r.price, cur)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Sentiment({ a }: { a: Analysis }) {
  const m = a.sentiment.macro;
  const trend = (t: string) => (t === "rising" ? "↑" : t === "falling" ? "↓" : "→");
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-4">
        <FearGreedGauge data={a.sentiment.fearGreed} title={a.asset.type === "crypto" ? "Crypto Fear & Greed" : "Aandelen Fear & Greed"} />
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Fed rente" value={m.fedFundsRate !== null ? `${m.fedFundsRate.toFixed(2)}% ${trend(m.rateTrend)}` : "—"} />
          <Metric label="Inflatie (CPI)" value={m.inflationYoY !== null ? `${m.inflationYoY.toFixed(1)}% ${trend(m.inflationTrend)}` : "—"} />
          <Metric label="US 10j rente" value={m.us10y !== null ? `${m.us10y.toFixed(2)}%` : "—"} />
          <Metric label="BTC dominantie" value={m.btcDominance !== null ? `${m.btcDominance.toFixed(1)}%` : "—"} />
        </div>
        <div className="rounded-lg bg-panel-2 px-3 py-2">
          <div className="text-[11px] text-muted">Nieuws-sentiment (NLP, tijdgewogen)</div>
          <div className={cn("font-mono text-lg font-bold tabular", TONE_TEXT[toneOf(a.sentiment.newsScore, 0.05)])}>
            {a.sentiment.newsScore > 0 ? "+" : ""}
            {a.sentiment.newsScore.toFixed(2)}
          </div>
        </div>
      </div>
      <NewsFeed items={a.sentiment.news} />
    </div>
  );
}

function Risk({ a }: { a: Analysis }) {
  const r = a.risk;
  return (
    <div>
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted">Volatiliteitsscore</span>
          <span className="font-mono font-semibold tabular">{r.volatilityScore}/100</span>
        </div>
        <div className="h-2 rounded-full bg-panel-2">
          <div
            className={cn("h-2 rounded-full", r.volatilityScore > 60 ? "bg-bear" : r.volatilityScore > 30 ? "bg-hold" : "bg-bull")}
            style={{ width: `${r.volatilityScore}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Volatiliteit 30d (jaarbasis)" value={formatPct(r.volatility30d, 1)} />
        <Metric label={`Beta vs ${r.benchmark}`} value={formatNumber(r.beta, 2)} />
        <Metric label="Max drawdown (1j)" value={formatPct(-r.maxDrawdown1y, 1)} />
        <Metric label="Rendement (1j)" value={formatPct(r.return1y, 1, true)} />
        <Metric label="Sharpe ratio (1j)" value={formatNumber(r.sharpe1y, 2)} />
        <Metric label="1-daagse VaR (95%)" value={formatPct(-r.var95Daily, 2)} hint="Historische Value-at-Risk" />
      </div>
    </div>
  );
}

const PANELS: Record<Pillar, (p: { a: Analysis }) => React.ReactElement> = {
  fundamental: Fundamentals,
  technical: Technical,
  sentiment: Sentiment,
  risk: Risk,
};

export function PillarTabs({ a }: { a: Analysis }) {
  const [tab, setTab] = useState<Pillar>("technical");
  const [dir, setDir] = useState(0);
  const select = (p: Pillar) => {
    setDir(ORDER.indexOf(p) > ORDER.indexOf(tab) ? 1 : -1);
    setTab(p);
  };
  // Swipe-navigatie op mobiel
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const i = ORDER.indexOf(tab);
    if (info.offset.x < -60 && i < ORDER.length - 1) select(ORDER[i + 1]);
    else if (info.offset.x > 60 && i > 0) select(ORDER[i - 1]);
  };
  const Panel = PANELS[tab];
  const pillar = a.pillars[tab];

  return (
    <Card>
      <Tabs value={tab} onValueChange={(v) => select(v as Pillar)}>
        <div className="border-b border-border p-2">
          <TabsList>
            {ORDER.map((p) => {
              const Icon = ICONS[p];
              const s = a.pillars[p].score;
              return (
                <TabsTrigger key={p} value={p}>
                  <Icon className="h-3.5 w-3.5" />
                  {PILLAR_NL[p]}
                  <span className={cn("font-mono tabular", TONE_TEXT[toneOf(s, 10)])}>
                    {s > 0 ? "+" : ""}
                    {s}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={tab}
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -dir * 40, opacity: 0 }}
            transition={{ duration: 0.18 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={onDragEnd}
            className="touch-pan-y p-4"
          >
            <Panel a={a} />
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted" />
                <h4 className="text-sm font-semibold">Beslissingsmatrix — {PILLAR_NL[tab]}</h4>
                <span className={cn("ml-auto font-mono text-sm font-bold tabular", TONE_TEXT[toneOf(pillar.score, 10)])}>
                  {pillar.score > 0 ? "+" : ""}
                  {pillar.score} / 100
                </span>
              </div>
              <FactorList factors={pillar.factors} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="border-t border-border px-4 py-2 text-center text-[11px] text-muted sm:hidden">← Swipe tussen pijlers →</p>
    </Card>
  );
}
