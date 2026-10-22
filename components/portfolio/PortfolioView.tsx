"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Trash2, Wallet } from "lucide-react";
import type { AssetType } from "@/types";
import { usePortfolio, positionPnl } from "@/lib/store/portfolio";
import { useQuotes } from "@/lib/hooks";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPct, formatPrice } from "@/lib/format";
import { searchUniverse } from "@/lib/api/universe";
import { cn } from "@/lib/utils";
import { usePositionAdvice } from "@/lib/usePositionAdvice";
import { SellAdviceBadge } from "@/components/kansen/AdviceBadge";
import { ScreenshotImport } from "./ScreenshotImport";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#64748b"];

function AddPositionForm() {
  const add = usePortfolio((s) => s.add);
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<AssetType>("stock");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const sym = symbol.trim().toUpperCase();
  const { data: quote } = useQuotes(sym.length > 0 ? [{ symbol: sym, type }] : []);
  const suggestion = sym ? searchUniverse(sym, 1)[0] : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(qty.replace(",", "."));
    const p = Number(price.replace(",", ".")) || quote?.[0]?.price || 0;
    if (!sym || !(q > 0) || !(p > 0)) return;
    add({ symbol: sym, name: quote?.[0]?.name ?? suggestion?.name ?? sym, type, quantity: q, buyPrice: p, buyDate: date, currency: quote?.[0]?.currency ?? "USD" });
    setSymbol("");
    setQty("");
    setPrice("");
  };

  const input = "h-9 w-full rounded-lg border border-border bg-panel-2 px-3 text-sm outline-none focus:border-accent/60";
  return (
    <Card>
      <CardHeader icon={<Plus className="h-4 w-4" />} title="Fictieve aankoop toevoegen" subtitle="Simuleer een positie en volg je winst/verlies live" />
      <CardBody>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <label className="col-span-2 text-xs text-muted md:col-span-1">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as AssetType)} className={cn(input, "mt-1")}>
              <option value="stock">Aandeel</option>
              <option value="crypto">Crypto</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Ticker
            <input
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                const s = searchUniverse(e.target.value, 1)[0];
                if (s && s.symbol === e.target.value.toUpperCase()) setType(s.type);
              }}
              placeholder="AAPL / BTC"
              className={cn(input, "mt-1 font-mono uppercase")}
              required
            />
          </label>
          <label className="text-xs text-muted">
            Aantal
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" placeholder="10" className={cn(input, "mt-1 font-mono")} required />
          </label>
          <label className="text-xs text-muted">
            Aankoopprijs
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder={quote?.[0] ? quote[0].price.toFixed(2) : "huidige koers"}
              className={cn(input, "mt-1 font-mono")}
            />
          </label>
          <label className="text-xs text-muted">
            Datum
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(input, "mt-1")} />
          </label>
          <div className="col-span-2 flex items-end md:col-span-1">
            <Button type="submit" variant="bull" className="w-full">
              <Plus className="h-4 w-4" /> Toevoegen
            </Button>
          </div>
        </form>
        {sym && quote?.[0] && (
          <p className="mt-2 text-xs text-muted">
            {quote[0].name}: huidige koers {formatPrice(quote[0].price, quote[0].currency)} — laat aankoopprijs leeg om die te gebruiken.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export function PortfolioView() {
  const { positions, remove, clear } = usePortfolio();
  const hydrated = useHydrated();
  const list = useMemo(() => (hydrated ? positions : []), [hydrated, positions]);

  const assets = useMemo(() => {
    const seen = new Map<string, { symbol: string; type: AssetType }>();
    list.forEach((p) => seen.set(`${p.type}:${p.symbol}`, { symbol: p.symbol, type: p.type }));
    return [...seen.values()];
  }, [list]);
  const { data: quotes = [], dataUpdatedAt } = useQuotes(assets);
  const { rows: adviceRows } = usePositionAdvice(list);

  const rows = list.map((p) => {
    const q = quotes.find((x) => x.symbol === p.symbol && x.type === p.type);
    const price = q?.price ?? p.buyPrice;
    return { p, q, price, ...positionPnl(p, price) };
  });
  const totals = rows.reduce((t, r) => ({ cost: t.cost + r.cost, value: t.value + r.value }), { cost: 0, value: 0 });
  const totalPnl = totals.value - totals.cost;
  const allocation = Object.values(
    rows.reduce<Record<string, { name: string; value: number }>>((acc, r) => {
      const k = `${r.p.type}:${r.p.symbol}`;
      acc[k] = { name: r.p.symbol, value: (acc[k]?.value ?? 0) + r.value };
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);
  const byClass = [
    { name: "Aandelen", value: rows.filter((r) => r.p.type === "stock").reduce((s, r) => s + r.value, 0) },
    { name: "Crypto", value: rows.filter((r) => r.p.type === "crypto").reduce((s, r) => s + r.value, 0) },
  ].filter((x) => x.value > 0);
  const largest = allocation[0] ? allocation[0].value / (totals.value || 1) : 0;

  return (
    <div className="space-y-4">
      <ScreenshotImport />
      <AddPositionForm />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Totale waarde", formatPrice(totals.value), ""],
          ["Inleg", formatPrice(totals.cost), ""],
          ["Winst / verlies", `${formatPrice(totalPnl)} (${formatPct(totals.cost ? totalPnl / totals.cost : 0, 2, true)})`, totalPnl >= 0 ? "text-bull" : "text-bear"],
        ].map(([l, v, cls]) => (
          <Card key={l} className="p-4">
            <div className="text-xs text-muted">{l}</div>
            <div className={cn("font-mono text-xl font-bold tabular", cls)}>{v}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader
            icon={<Wallet className="h-4 w-4" />}
            title="Posities"
            subtitle={dataUpdatedAt ? `Koersen bijgewerkt ${new Date(dataUpdatedAt).toLocaleTimeString("nl-NL")}` : undefined}
            action={list.length > 0 && <Button size="sm" variant="ghost" onClick={() => confirm("Alle posities verwijderen?") && clear()}>Wis alles</Button>}
          />
          {list.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">Nog geen posities. Voeg hierboven een fictieve aankoop toe.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2">Asset</th>
                    <th className="px-2 text-right">Aantal</th>
                    <th className="px-2 text-right">Aankoop</th>
                    <th className="px-2 text-right">Koers</th>
                    <th className="px-2 text-right">Waarde</th>
                    <th className="px-2 text-right">PnL</th>
                    <th className="px-2">Advies</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ p, q, price, value, pnl, pnlPct }) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-panel-2">
                      <td className="px-4 py-2">
                        <Link href={`/asset/${p.type}/${p.symbol}`} className="font-mono font-semibold hover:text-accent">
                          {p.symbol}
                        </Link>
                        <div className="text-[11px] text-muted">
                          {p.name} · {p.buyDate} {q?.source === "mock" && <Badge tone="hold" className="ml-1">mock</Badge>}
                        </div>
                      </td>
                      <td className="px-2 text-right font-mono tabular">{p.quantity}</td>
                      <td className="px-2 text-right font-mono tabular">{formatPrice(p.buyPrice, p.currency)}</td>
                      <td className="px-2 text-right font-mono tabular">{formatPrice(price, p.currency)}</td>
                      <td className="px-2 text-right font-mono tabular">{formatPrice(value, p.currency)}</td>
                      <td className={cn("px-2 text-right font-mono tabular", pnl >= 0 ? "text-bull" : "text-bear")}>
                        {formatPrice(pnl, p.currency)}
                        <div className="text-[11px]">{formatPct(pnlPct, 2, true)}</div>
                      </td>
                      <td className="px-2">
                        {(() => {
                          const a = adviceRows.find((x) => x.position.id === p.id)?.advice;
                          return a ? (
                            <span title={a.reason}>
                              <SellAdviceBadge action={a.action} />
                            </span>
                          ) : (
                            <span className="text-xs text-muted">…</span>
                          );
                        })()}
                      </td>
                      <td className="px-2">
                        <button aria-label={`Verwijder ${p.symbol}`} onClick={() => remove(p.id)} className="rounded p-1 text-muted hover:text-bear">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Risicospreiding" subtitle="Verdeling op marktwaarde" />
          <CardBody>
            {allocation.length === 0 ? (
              <p className="text-sm text-muted">Geen data.</p>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocation} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2} stroke="none">
                        {allocation.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [formatPct(Number(v) / (totals.value || 1), 1), "aandeel"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1 text-xs">
                  {allocation.map((a, i) => (
                    <li key={a.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="font-mono">{a.name}</span>
                      <span className="ml-auto font-mono tabular text-muted">{formatPct(a.value / (totals.value || 1), 1)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs">
                  {byClass.map((c) => (
                    <div key={c.name} className="flex justify-between">
                      <span className="text-muted">{c.name}</span>
                      <span className="font-mono tabular">{formatPct(c.value / (totals.value || 1), 1)}</span>
                    </div>
                  ))}
                  {largest > 0.4 && (
                    <p className="pt-2 text-hold">
                      Concentratierisico: {allocation[0].name} is {formatPct(largest, 0)} van je portfolio. Overweeg te spreiden.
                    </p>
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
