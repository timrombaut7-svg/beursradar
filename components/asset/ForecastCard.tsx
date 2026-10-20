"use client";
import { Telescope } from "lucide-react";
import type { Analysis, AssetType } from "@/types";
import { useCandles } from "@/lib/hooks";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const HISTORY = 60;
const W = 640;
const H = 220;
const PAD = { l: 4, r: 4, t: 8, b: 8 };

const fmtDay = (t: number) => new Date(t * 1000).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

/** Waaier van waarschijnlijke koersen: de laatste ± 3 maanden plus de komende weken. */
export function ForecastCard({ a, type }: { a: Analysis; type: AssetType }) {
  const f = a.forecast;
  const { data } = useCandles(type, a.asset.symbol, "1D");
  if (!f) return null;

  const cur = a.asset.currency;
  const past = (data?.candles ?? []).filter((c) => c.time <= f.startTime).slice(-HISTORY);
  const pts = f.points;
  const n = past.length + pts.length;
  const values = [...past.map((c) => c.close), f.startPrice, ...pts.flatMap((p) => [p.p10, p.p90])];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || hi * 0.01 || 1;
  const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b);

  // Index 0 van de vooruitblik is "nu": het laatste punt van de historie (of het startpunt)
  const nowIdx = Math.max(0, past.length - 1);
  const fx = (k: number) => x(nowIdx + k);
  const startY = y(f.startPrice);
  const band = (lower: "p10" | "p25", upper: "p75" | "p90") =>
    [
      `M ${fx(0)} ${startY}`,
      ...pts.map((p, k) => `L ${fx(k + 1)} ${y(p[upper])}`),
      ...pts.map((_, k) => pts[pts.length - 1 - k]).map((p, k) => `L ${fx(pts.length - k)} ${y(p[lower])}`),
      "Z",
    ].join(" ");
  const median = [`M ${fx(0)} ${startY}`, ...pts.map((p, k) => `L ${fx(k + 1)} ${y(p.p50)}`)].join(" ");
  const history = past.map((c, i) => `${i ? "L" : "M"} ${x(i)} ${y(c.close)}`).join(" ");
  const last = pts[pts.length - 1];
  const up = f.medianReturn >= 0;
  const weeks = type === "crypto" ? "± 1 maand" : "± 4 weken";

  const stats = [
    { label: "Middenscenario", value: formatPrice(last.p50, cur), sub: formatPct(f.medianReturn, 1, true), tone: up ? "text-bull" : "text-bear" },
    { label: "8 van de 10 keer tussen", value: `${formatPrice(last.p10, cur)} – ${formatPrice(last.p90, cur)}`, sub: `${formatPct(f.lowReturn, 0, true)} tot ${formatPct(f.highReturn, 0, true)}`, tone: "" },
    { label: "Kans op hoger", value: formatPct(f.probUp, 0), sub: f.probUp >= 0.5 ? "vaker omhoog" : "vaker omlaag", tone: f.probUp >= 0.55 ? "text-bull" : f.probUp <= 0.45 ? "text-bear" : "" },
  ];

  return (
    <Card>
      <CardHeader
        icon={<Telescope className="h-4 w-4" />}
        title={`Vooruitblik — ${weeks}`}
        subtitle="Wat deed de koers vroeger na een vergelijkbaar beeld? Dat zie je hier als waaier."
      />
      <CardBody className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 rounded-lg bg-panel-2 px-3 py-2 sm:block">
              <div className="text-[11px] leading-tight text-muted">{s.label}</div>
              <div className="text-right sm:text-left">
                <div className={cn("font-mono text-sm font-bold tabular", s.tone)}>{s.value}</div>
                <div className="text-[11px] text-muted">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          {/* Uitgerekt over de volle breedte; lijnen blijven even dik dankzij non-scaling-stroke */}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-48 w-full sm:h-56" role="img" aria-label={`Vooruitblik voor ${a.asset.symbol}`}>
            <line x1={fx(0)} x2={fx(0)} y1={0} y2={H} className="stroke-border" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <path d={band("p10", "p90")} className="fill-accent/15" />
            <path d={band("p25", "p75")} className="fill-accent/30" />
            {history && <path d={history} fill="none" className="stroke-text" strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
            <path d={median} fill="none" className="stroke-accent" strokeWidth={2.2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="relative mt-1 h-4 text-[11px] text-muted">
            {past.length > 0 && <span className="absolute left-0">{fmtDay(past[0].time)}</span>}
            <span className="absolute -translate-x-1/2" style={{ left: `${(fx(0) / W) * 100}%` }}>
              nu
            </span>
            <span className="absolute right-0">{fmtDay(last.time)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-accent/25" /> 5 van de 10 keer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-accent/15" /> 8 van de 10 keer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-accent" /> middenscenario
          </span>
        </div>

        <p className="text-xs text-muted">
          {f.basis === "similar"
            ? `Gebaseerd op ${f.samples} momenten in de afgelopen jaren waarop ${a.asset.symbol} een vergelijkbaar technisch beeld had als nu.`
            : `Er waren te weinig momenten met een vergelijkbaar beeld, dus dit is gebaseerd op het normale koersgedrag van ${a.asset.symbol} (${f.samples} momenten).`}{" "}
          Dit is geen garantie: het laat zien wat er vroeger gebeurde, niet wat er gaat gebeuren. Nieuws en verrassingen kunnen alles veranderen.
        </p>
      </CardBody>
    </Card>
  );
}
