"use client";
import Link from "next/link";
import { BellRing, Loader2 } from "lucide-react";
import { usePortfolio } from "@/lib/store/portfolio";
import { useHydrated } from "@/lib/useHydrated";
import { usePositionAdvice } from "@/lib/usePositionAdvice";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LivePriceValue } from "@/components/LivePrice";
import { SellAdviceBadge } from "./AdviceBadge";

const ORDER = { SELL: 0, TAKE_PROFIT: 1, HOLD: 2 } as const;

export function HoldingsAdvice() {
  const hydrated = useHydrated();
  const positions = usePortfolio((s) => s.positions);
  const remove = usePortfolio((s) => s.remove);
  const list = hydrated ? positions : [];
  const { rows, isLoading } = usePositionAdvice(list);
  const sorted = [...rows].sort((a, b) => ORDER[a.advice?.action ?? "HOLD"] - ORDER[b.advice?.action ?? "HOLD"]);
  const alerts = rows.filter((r) => r.advice && r.advice.action !== "HOLD").length;

  return (
    <Card>
      <CardHeader
        icon={<BellRing className="h-4 w-4" />}
        title="Jouw posities: wanneer verkopen?"
        subtitle={list.length ? `${list.length} posities · ${alerts} met actie` : "Nog geen posities"}
      />
      {list.length === 0 && (
        <p className="p-4 text-sm text-muted">
          Klik bij een kans op <span className="font-semibold text-bull">Gekocht</span>. Daarna zie je hier wanneer je moet verkopen.
        </p>
      )}
      {isLoading && list.length > 0 && (
        <p className="flex items-center gap-2 p-4 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Actuele signalen ophalen…
        </p>
      )}
      <ul className="divide-y divide-border">
        {sorted.map(({ position: p, price, advice }) => {
          const pnl = price !== undefined ? price / p.buyPrice - 1 : null;
          return (
            <li
              key={p.id}
              className={cn(
                "grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] sm:items-center",
                advice?.action === "SELL" && "bg-bear/5",
                advice?.action === "TAKE_PROFIT" && "bg-hold/5",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/asset/${p.type}/${p.symbol}`} className="font-mono font-bold hover:text-accent">
                    {p.symbol}
                  </Link>
                  {advice && <SellAdviceBadge action={advice.action} />}
                  <span className="text-[10px] uppercase tracking-wide text-muted">{p.horizon === "long" ? "lange termijn" : "korte termijn"}</span>
                </div>
                <p className="text-xs text-muted">
                  {Number(p.quantity.toPrecision(6))} × {formatPrice(p.buyPrice, p.currency)} · {p.buyDate}
                </p>
                <p className="text-sm">
                  {price !== undefined ? <LivePriceValue price={price} currency={p.currency} /> : <span className="text-muted">…</span>}{" "}
                  {pnl !== null && <span className={cn("font-mono tabular", pnl >= 0 ? "text-bull" : "text-bear")}>{formatPct(pnl, 1, true)}</span>}
                </p>
              </div>
              <div className="min-w-0 text-sm">
                <p className={cn(advice?.action === "SELL" ? "text-bear" : advice?.action === "TAKE_PROFIT" ? "text-hold" : "text-muted")}>
                  {advice?.reason ?? "…"}
                </p>
                {p.stopLoss && (
                  <p className="mt-1 font-mono text-[11px] text-muted tabular">
                    verkopen onder {formatPrice(p.stopLoss, p.currency)}
                    {advice?.toStopPct != null && ` (${formatPct(advice.toStopPct, 1)} ruimte)`}
                    {p.target1 ? ` · doel 1 ${formatPrice(p.target1, p.currency)}` : ""}
                    {p.target2 ? ` · doel 2 ${formatPrice(p.target2, p.currency)}` : ""}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant={advice?.action === "HOLD" ? "ghost" : "outline"}
                onClick={() => confirm(`${p.symbol} als verkocht markeren en uit je portfolio halen?`) && remove(p.id)}
              >
                Verkocht
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
