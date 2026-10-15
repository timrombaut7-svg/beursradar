"use client";
import { Crosshair, Flag, OctagonX, Target } from "lucide-react";
import type { Analysis } from "@/types";
import { formatPct, formatPrice } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Visuele ladder van stop → instap → targets met proportionele afstanden. */
function Ladder({ a }: { a: Analysis }) {
  const p = a.tradePlan;
  const levels = [
    { label: "Target 2", price: p.target2, cls: "bg-bull" },
    { label: "Target 1", price: p.target1, cls: "bg-bull/70" },
    { label: "Koers", price: a.technical.price, cls: "bg-text" },
    { label: "Instap", price: (p.entryLow + p.entryHigh) / 2, cls: "bg-accent" },
    { label: "Stop", price: p.stopLoss, cls: "bg-bear" },
  ];
  const min = Math.min(...levels.map((l) => l.price));
  const max = Math.max(...levels.map((l) => l.price));
  const pos = (v: number) => ((v - min) / (max - min || 1)) * 100;
  return (
    <div className="relative mx-2 h-44">
      <div className="absolute bottom-0 left-16 top-0 w-1 rounded-full bg-panel-2" />
      <div
        className="absolute left-16 w-1 rounded-full bg-accent/50"
        style={{ bottom: `${pos(p.entryLow)}%`, height: `${Math.max(1, pos(p.entryHigh) - pos(p.entryLow))}%` }}
      />
      {levels.map((l) => (
        <div key={l.label} className="absolute left-0 right-0 flex -translate-y-1/2 items-center gap-2" style={{ top: `${100 - pos(l.price)}%` }}>
          <span className="w-14 text-right text-[10px] text-muted">{l.label}</span>
          <span className={cn("h-2.5 w-2.5 rounded-full", l.cls)} />
          <span className="font-mono text-[11px] tabular">{formatPrice(l.price, a.asset.currency)}</span>
        </div>
      ))}
    </div>
  );
}

export function ActionPlanCard({ a }: { a: Analysis }) {
  const p = a.tradePlan;
  const cur = a.asset.currency;
  const long = p.direction === "long";
  const rows = [
    { icon: Crosshair, label: "Instapzone", value: `${formatPrice(p.entryLow, cur)} – ${formatPrice(p.entryHigh, cur)}`, tone: "text-accent" },
    { icon: Target, label: "Target 1 (conservatief)", value: formatPrice(p.target1, cur), sub: `R/R 1:${p.riskReward1.toFixed(1)}`, tone: "text-bull" },
    { icon: Flag, label: "Target 2 (agressief)", value: formatPrice(p.target2, cur), sub: `R/R 1:${p.riskReward2.toFixed(1)}`, tone: "text-bull" },
    { icon: OctagonX, label: "Stop-loss", value: formatPrice(p.stopLoss, cur), sub: `risico ${formatPct(p.riskPct, 1)}`, tone: "text-bear" },
  ];
  return (
    <Card>
      <CardHeader
        title="Trade Executieplan"
        subtitle="Op basis van support/resistance, ATR en Fibonacci"
        action={<Badge tone={long ? "bull" : "bear"}>{long ? "Long" : "Short / uitstap"}</Badge>}
      />
      <CardBody className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 rounded-lg bg-panel-2 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted">
                <r.icon className={cn("h-4 w-4", r.tone)} />
                {r.label}
              </span>
              <span className="text-right">
                <span className={cn("block font-mono text-sm font-semibold tabular", r.tone)}>{r.value}</span>
                {r.sub && <span className="block text-[11px] text-muted">{r.sub}</span>}
              </span>
            </div>
          ))}
          <div className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs font-medium">Risk/Reward ratio</p>
            <p className="font-mono text-2xl font-bold tabular text-bull">1 : {p.riskReward2.toFixed(1)}</p>
            <p className="text-[11px] text-muted">bij target 2 (target 1: 1 : {p.riskReward1.toFixed(1)})</p>
          </div>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
            {p.rationale.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <Ladder a={a} />
      </CardBody>
    </Card>
  );
}
