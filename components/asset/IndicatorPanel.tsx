"use client";
import type { Analysis } from "@/types";
import { formatNumber, formatPct, formatPrice } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TermLabel } from "@/components/TermLabel";

function Cell({ label, value, badge, tone }: { label: string; value: string; badge?: string; tone?: "bull" | "bear" | "hold" | "neutral" }) {
  return (
    <div className="rounded-lg bg-panel-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <TermLabel label={label} className="text-[11px] uppercase tracking-wide text-muted" />
        {badge && <Badge tone={tone ?? "neutral"}>{badge}</Badge>}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular">{value}</div>
    </div>
  );
}

export function IndicatorPanel({ a }: { a: Analysis }) {
  const t = a.technical;
  const cur = a.asset.currency;
  const rsiTone = t.rsiStatus === "oversold" ? "bull" : t.rsiStatus === "overbought" ? "bear" : "neutral";
  const macdTone = t.macd ? (t.macd.histogram >= 0 ? "bull" : "bear") : "neutral";
  return (
    <Card>
      <CardHeader title="Indicatoren" subtitle="Dagcandles · berekend door de Beursradar-engine" />
      <div className="grid grid-cols-2 gap-2 p-3">
        <Cell
          label="RSI (14)"
          value={formatNumber(t.rsi, 1)}
          badge={t.rsiStatus === "oversold" ? "Oversold" : t.rsiStatus === "overbought" ? "Overbought" : "Neutraal"}
          tone={rsiTone}
        />
        <Cell
          label="MACD hist."
          value={t.macd ? formatNumber(t.macd.histogram, 3) : "—"}
          badge={t.macdCross ? `${t.macdCross === "bullish" ? "Bull" : "Bear"} cross ${t.macdCrossBarsAgo}d` : t.macd && t.macd.histogram >= 0 ? "Positief" : "Negatief"}
          tone={macdTone}
        />
        <Cell
          label="EMA 50 / 200"
          value={`${formatPrice(t.ema50, cur)}`}
          badge={t.maCross ? `${t.maCross === "golden" ? "Golden" : "Death"} cross ${t.maCrossBarsAgo}d` : t.ema50 && t.ema200 && t.ema50 > t.ema200 ? "Uptrend" : "Downtrend"}
          tone={t.maCross === "golden" || (t.ema50 && t.ema200 && t.ema50 > t.ema200) ? "bull" : "bear"}
        />
        <Cell
          label="Bollinger %B"
          value={t.bollinger ? formatNumber(t.bollinger.percentB, 2) : "—"}
          badge={t.bollingerSqueeze ? "Squeeze" : t.bollinger ? `BW ${formatPct(t.bollinger.bandwidth, 1)}` : undefined}
          tone={t.bollingerSqueeze ? "hold" : "neutral"}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border p-3 text-xs">
        <div>
          <p className="mb-1 font-medium text-bear">Weerstand</p>
          {t.resistances.length === 0 && <p className="text-muted">Geen (all-time high zone)</p>}
          {t.resistances.slice(0, 4).map((r) => (
            <div key={r.price} className="flex justify-between font-mono tabular">
              <span>{formatPrice(r.price, cur)}</span>
              <span className="text-muted">{r.origin} ×{r.strength}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-1 font-medium text-bull">Support</p>
          {t.supports.slice(0, 4).map((s) => (
            <div key={s.price} className="flex justify-between font-mono tabular">
              <span>{formatPrice(s.price, cur)}</span>
              <span className="text-muted">{s.origin} ×{s.strength}</span>
            </div>
          ))}
        </div>
      </div>
      {t.pivots && (
        <div className="grid grid-cols-5 gap-1 border-t border-border p-3 text-center text-[11px]">
          {(["s2", "s1", "p", "r1", "r2"] as const).map((k) => (
            <div key={k}>
              <div className={cn("uppercase", k.startsWith("s") ? "text-bull" : k.startsWith("r") ? "text-bear" : "text-muted")}>{k}</div>
              <div className="font-mono tabular">{formatPrice(t.pivots![k], cur)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
