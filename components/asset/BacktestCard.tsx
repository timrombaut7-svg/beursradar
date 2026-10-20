"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FlaskConical } from "lucide-react";
import type { Analysis } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TermLabel } from "@/components/TermLabel";

const fmtDate = (t: number) => new Date(t * 1000).toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });

export function BacktestCard({ a }: { a: Analysis }) {
  const b = a.backtest;
  const beat = b.strategyReturn >= b.buyHoldReturn;
  const stats = [
    { label: "Strategie", value: formatPct(b.strategyReturn, 1, true), tone: b.strategyReturn >= 0 ? "text-bull" : "text-bear" },
    { label: "Buy & Hold", value: formatPct(b.buyHoldReturn, 1, true), tone: b.buyHoldReturn >= 0 ? "text-bull" : "text-bear" },
    { label: "Trades", value: String(b.trades.length), tone: "" },
    { label: "Win rate", value: formatPct(b.winRate, 0), tone: "" },
    { label: "Max drawdown", value: formatPct(-b.maxDrawdown, 1), tone: "text-bear" },
    { label: "Tijd in markt", value: formatPct(b.exposure, 0), tone: "" },
  ];
  return (
    <Card>
      <CardHeader
        icon={<FlaskConical className="h-4 w-4" />}
        title="Backtest — laatste 12 maanden"
        subtitle="Technisch signaal-algoritme · instap op score ≥ +20, uitstap ≤ −10 of 2×ATR stop · 0,1% kosten/kant"
      />
      <CardBody>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-panel-2 px-3 py-2">
              <div className="text-[11px] text-muted">
                <TermLabel label={s.label} />
              </div>
              <div className={cn("font-mono text-sm font-bold tabular", s.tone)}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={b.equityCurve} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tickFormatter={fmtDate} stroke="var(--muted)" fontSize={11} minTickGap={40} />
              <YAxis stroke="var(--muted)" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleDateString("nl-NL")}
                formatter={(v) => [Number(v).toFixed(1), undefined]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="strategy" name="Beursradar-strategie" stroke="var(--bull)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="buyHold" name="Buy & Hold" stroke="var(--muted)" dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className={cn("mt-2 text-xs", beat ? "text-bull" : "text-muted")}>
          {beat
            ? `Het algoritme versloeg buy & hold met ${formatPct(b.strategyReturn - b.buyHoldReturn, 1)}.`
            : `Buy & hold presteerde ${formatPct(b.buyHoldReturn - b.strategyReturn, 1)} beter — het algoritme ruilt rendement in voor lagere blootstelling.`}{" "}
          Resultaten uit het verleden bieden geen garantie voor de toekomst.
        </p>
        {b.trades.length > 0 && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer text-muted hover:text-text">Bekijk {b.trades.length} trades</summary>
            <div className="mt-2 max-h-56 overflow-auto">
              <table className="w-full font-mono tabular">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-1">In</th>
                    <th>Prijs</th>
                    <th>Uit</th>
                    <th>Prijs</th>
                    <th>Reden</th>
                    <th className="text-right">Resultaat</th>
                  </tr>
                </thead>
                <tbody>
                  {b.trades.map((t) => (
                    <tr key={t.entryTime} className="border-t border-border">
                      <td className="py-1">{new Date(t.entryTime * 1000).toLocaleDateString("nl-NL")}</td>
                      <td>{formatPrice(t.entryPrice, a.asset.currency)}</td>
                      <td>{new Date(t.exitTime * 1000).toLocaleDateString("nl-NL")}</td>
                      <td>{formatPrice(t.exitPrice, a.asset.currency)}</td>
                      <td className="text-muted">{t.exitReason === "stop" ? "stop-loss" : t.exitReason === "end" ? "open" : "signaal"}</td>
                      <td className={cn("text-right", t.returnPct >= 0 ? "text-bull" : "text-bear")}>{formatPct(t.returnPct, 1, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </CardBody>
    </Card>
  );
}
