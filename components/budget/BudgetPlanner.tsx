"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, PiggyBank, ShieldCheck } from "lucide-react";
import type { Horizon } from "@/types";
import { RISK_PROFILES, type AllocationItem, type Bucket, type RiskProfile } from "@/lib/engine/allocate";
import { useBudget } from "@/lib/store/budget";
import { useBudgetPlan } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BuyDialog } from "@/components/kansen/BuyDialog";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const BUCKET_META: Record<Bucket | "reserve", { label: string; color: string; badge: "accent" | "bull" | "hold" | "neutral" }> = {
  etf: { label: "ETF's", color: "bg-accent", badge: "accent" },
  stock: { label: "Aandelen", color: "bg-bull", badge: "bull" },
  crypto: { label: "Crypto", color: "bg-hold", badge: "hold" },
  reserve: { label: "Reserve", color: "bg-muted/50", badge: "neutral" },
};

const QUICK = [100, 500, 1000, 5000];
const euro = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const units = (v: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: v < 1 ? 4 : v < 10 ? 2 : 1 }).format(v);

export function BudgetPlanner() {
  const hydrated = useHydrated();
  const { amount, risk, horizon, set } = useBudget();
  const [text, setText] = useState(String(amount));
  // Pas na even stoppen met typen opnieuw rekenen
  useEffect(() => {
    const n = Number(text.replace(/\./g, "").replace(",", "."));
    const t = setTimeout(() => {
      if (Number.isFinite(n) && n >= 10 && n !== amount) set({ amount: Math.round(n) });
    }, 500);
    return () => clearTimeout(t);
  }, [text, amount, set]);

  const { data, isLoading, isFetching, isError, error } = useBudgetPlan(hydrated ? amount : 0, risk, horizon);

  if (!hydrated) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Hoeveel wil je beleggen?</span>
            <div className="mt-1.5 flex h-12 items-center gap-2 rounded-xl border border-border bg-panel-2 px-3 focus-within:border-accent">
              <span className="text-lg text-muted">€</span>
              <input
                inputMode="decimal"
                value={text}
                onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ""))}
                className="w-full min-w-0 bg-transparent font-mono text-xl outline-none"
                aria-label="Bedrag in euro"
              />
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setText(String(q));
                  set({ amount: q });
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  amount === q ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted hover:text-text",
                )}
              >
                {euro(q)}
              </button>
            ))}
          </div>

          <div>
            <span className="text-sm font-semibold">Hoeveel risico durf je?</span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
              {(Object.keys(RISK_PROFILES) as RiskProfile[]).map((r) => (
                <button
                  key={r}
                  onClick={() => set({ risk: r })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    risk === r ? "border-accent/60 bg-accent/10" : "border-border bg-panel-2/50 hover:border-border hover:bg-panel-2",
                  )}
                >
                  <div className="text-sm font-semibold">{RISK_PROFILES[r].label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted">{RISK_PROFILES[r].description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-semibold">Hoe lang wil je het laten staan?</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1" role="tablist">
              {([
                ["long", "Lang", "maanden tot jaren"],
                ["short", "Kort", "een paar weken"],
              ] as [Horizon, string, string][]).map(([h, label, sub]) => (
                <button
                  key={h}
                  role="tab"
                  aria-selected={horizon === h}
                  onClick={() => set({ horizon: h })}
                  className={cn("rounded-lg px-3 py-1.5 text-left text-sm", horizon === h ? "bg-panel text-text shadow-sm" : "text-muted")}
                >
                  <span className="font-medium">{label}</span> <span className="text-[11px] text-muted">({sub})</span>
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {isLoading && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Alle aandelen, ETF&apos;s en crypto worden geanalyseerd…
          </p>
          <Skeleton className="h-64" />
        </div>
      )}
      {isError && <p className="text-sm text-bear">Plan maken lukt nu niet: {(error as Error).message}</p>}

      {data && (
        <Card className={cn(isFetching && "opacity-80 transition-opacity")}>
          <CardHeader
            icon={<PiggyBank className="h-4 w-4" />}
            title={`Jouw plan voor ${euro(data.amount)}`}
            subtitle={`${RISK_PROFILES[data.risk].label} · ${data.horizon === "long" ? "lange termijn" : "korte termijn"} · met de live koersen van nu`}
          />
          <CardBody className="space-y-4">
            <MixBar plan={data} />
            {data.items.length === 0 ? (
              <p className="text-sm text-muted">Er zijn nu geen kansen die de historische toets halen. Houd je geld voorlopig apart.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.items.map((i) => (
                  <PlanRow key={`${i.opportunity.row.type}:${i.opportunity.row.symbol}`} item={i} rates={data.rates} />
                ))}
              </ul>
            )}
            <ul className="space-y-1.5 rounded-xl bg-panel-2 p-3 text-xs leading-relaxed text-muted">
              {data.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
              <li>• Dit is een berekening van een algoritme, geen financieel advies.</li>
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function MixBar({ plan }: { plan: NonNullable<ReturnType<typeof useBudgetPlan>["data"]> }) {
  const parts = [
    ...(["etf", "stock", "crypto"] as Bucket[]).map((b) => ({ key: b, value: plan.buckets[b].actual })),
    { key: "reserve" as const, value: plan.reserve / plan.amount },
  ].filter((p) => p.value > 0.0005);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-panel-2">
        {parts.map((p) => (
          <div key={p.key} className={BUCKET_META[p.key].color} style={{ width: `${p.value * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {parts.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", BUCKET_META[p.key].color)} />
            {BUCKET_META[p.key].label} <span className="font-mono tabular text-muted">{formatPct(p.value, 0)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanRow({ item, rates }: { item: AllocationItem; rates: Record<string, number> }) {
  const o = item.opportunity;
  const r = o.row;
  const e = r.evidence[o.horizon];
  const rate = rates[r.currency];
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/asset/${r.type}/${r.symbol}`} className="font-mono font-bold hover:text-accent">
              {r.symbol}
            </Link>
            <Badge tone={BUCKET_META[item.bucket].badge}>{item.bucket === "etf" ? "ETF" : item.bucket === "crypto" ? "crypto" : "aandeel"}</Badge>
          </div>
          <p className="truncate text-xs text-muted">{r.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-lg font-bold tabular">{euro(item.amount)}</div>
          <div className="text-[11px] text-muted">{formatPct(item.weight, 0)} van je budget</div>
        </div>
      </div>
      <p className="text-xs text-muted">
        {item.units !== null ? (
          <>
            ≈ {units(item.units)} stuks à {formatPrice(r.price, r.currency)}
          </>
        ) : (
          <>Koers {formatPrice(r.price, r.currency)}</>
        )}
        {o.horizon === "short" && <> · verkopen onder {formatPrice(o.plan.stopLoss, r.currency)}</>}
        {" · "}houden: {o.hold.label}
      </p>
      <p className="flex items-start gap-1.5 text-xs">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bull" />
        <span>
          {o.explanation.why[0] ?? o.explanation.headline} Vroeger {e.wins} van de {e.samples} keer winst (gemiddeld{" "}
          {formatPct(e.avgReturn, 1, true)}).
        </span>
      </p>
      <div className="pt-1">
        <BuyDialog opportunity={o} defaultAmount={rate ? item.amount / rate : undefined} />
      </div>
    </li>
  );
}
