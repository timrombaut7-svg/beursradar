"use client";
import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Trophy } from "lucide-react";
import type { AssetType } from "@/types";
import { useGame } from "@/lib/hooks";
import { searchUniverse } from "@/lib/api/universe";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const eur = formatEur;
/** Kleur bij winst/verlies; afrondingsruis (−0,00%) blijft neutraal */
const tone = (v: number, eps = 1e-4) => (v > eps ? "text-bull" : v < -eps ? "text-bear" : "");

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Mislukt");
  return json;
}

/** Het €100.000-spel: je krijgt nepgeld en belegt tegen echte, live koersen. */
export function GameView() {
  const { data: g, isLoading, isError, error } = useGame();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["game"] });

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !g) return <p className="text-sm text-bear">Het spel kon niet geladen worden: {(error as Error)?.message}</p>;

  const stats = [
    { label: "Totale waarde", value: eur(g.equityEur), tone: "" },
    { label: "Winst / verlies", value: `${g.equityEur >= g.startEur ? "+" : ""}${eur(g.equityEur - g.startEur)}`, tone: tone(g.equityEur - g.startEur) },
    { label: "Rendement", value: formatPct(g.returnPct, 2, true), tone: tone(g.returnPct) },
    { label: "Cash over", value: eur(g.cashEur), tone: "" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-panel/80 p-3">
            <div className="text-[11px] text-muted">{s.label}</div>
            <div className={cn("font-mono text-lg font-bold tabular", s.tone)}>{s.value}</div>
          </div>
        ))}
      </div>

      <OrderForm cashEur={g.cashEur} holdings={g.holdings} onDone={refresh} />

      <Card>
        <CardHeader icon={<Trophy className="h-4 w-4" />} title="Jouw beleggingen" subtitle="Live koersen in euro · verversen elke 30 seconden" />
        {g.holdings.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            Je hebt nog niets gekocht. Zoek hierboven een aandeel of crypto, of kijk bij <Link href="/kansen" className="text-accent underline">Kansen</Link> wat
            de app aanraadt.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {g.holdings.map((h) => (
              <li key={`${h.type}:${h.symbol}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link href={`/asset/${h.type}/${h.symbol}`} className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    <span className="font-mono">{h.symbol}</span> <span className="text-muted">{h.name}</span>
                  </div>
                  <div className="text-[11px] text-muted">
                    {Number(h.quantity.toPrecision(6))} stuks · gekocht {eur(h.avgPriceEur)} · nu {eur(h.priceEur)}
                  </div>
                </Link>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold tabular">{eur(h.valueEur)}</div>
                  <div className={cn("font-mono text-[11px] tabular", tone(h.pnlEur))}>
                    {h.pnlEur >= 0 ? "+" : ""}
                    {eur(h.pnlEur)} ({formatPct(h.pnlPct, 1, true)})
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {g.trades.length > 0 && (
        <Card>
          <CardHeader title="Laatste orders" />
          <ul className="divide-y divide-border text-sm">
            {g.trades.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-4 py-2">
                <span>
                  <span className={t.side === "buy" ? "text-bull" : "text-bear"}>{t.side === "buy" ? "Gekocht" : "Verkocht"}</span>{" "}
                  {Number(t.quantity.toPrecision(6))} {t.symbol}
                </span>
                <span className="text-right text-xs text-muted">
                  {eur(t.quantity * t.priceEur)} · {new Date(t.createdAt).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ResetButton onDone={refresh} />
    </div>
  );
}

function OrderForm({
  cashEur,
  holdings,
  onDone,
}: {
  cashEur: number;
  holdings: { symbol: string; type: AssetType; name: string; quantity: number; priceEur: number }[];
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [asset, setAsset] = useState<{ symbol: string; type: AssetType; name: string } | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const results = !asset && query.trim() ? searchUniverse(query, 6) : [];
  const held = asset ? holdings.find((h) => h.symbol === asset.symbol && h.type === asset.type) : undefined;

  const submit = async (all = false) => {
    if (!asset) return;
    const value = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!all && !(value > 0)) return setMsg({ ok: false, text: "Vul een bedrag in euro in" });
    setBusy(true);
    setMsg(null);
    try {
      const r = (await post("/api/game/trade", {
        symbol: asset.symbol,
        type: asset.type,
        side,
        ...(all ? {} : { amountEur: value }),
      })) as { quantity: number; priceEur: number; totalEur: number };
      setMsg({
        ok: true,
        text: `${side === "buy" ? "Gekocht" : "Verkocht"}: ${Number(r.quantity.toPrecision(6))} ${asset.symbol} à ${eur(r.priceEur)} (${eur(r.totalEur)} incl. 0,1% kosten)`,
      });
      setAmount("");
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const input = "h-10 w-full rounded-xl border border-border bg-panel-2 px-3 text-sm outline-none focus:border-accent/60";
  return (
    <Card>
      <CardHeader title="Kopen of verkopen" subtitle={`Tegen de live koers van nu · je hebt ${eur(cashEur)} cash`} />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1 text-sm">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn("rounded-lg py-1.5 font-medium", side === s ? (s === "buy" ? "bg-bull text-black" : "bg-bear text-white") : "text-muted")}
            >
              {s === "buy" ? "Kopen" : "Verkopen"}
            </button>
          ))}
        </div>

        {asset ? (
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
            <span>
              <span className="font-mono font-semibold">{asset.symbol}</span> <span className="text-muted">{asset.name}</span>
              {held && <span className="block text-[11px] text-muted">Je hebt {Number(held.quantity.toPrecision(6))} stuks ({eur(held.quantity * held.priceEur)})</span>}
            </span>
            <button onClick={() => setAsset(null)} className="text-xs text-accent">
              wijzig
            </button>
          </div>
        ) : (
          <div className="relative">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek: Apple, ASML, Bitcoin, VWRL…" className={input} />
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-panel shadow-xl">
                {results.map((r) => (
                  <li key={`${r.type}:${r.symbol}`}>
                    <button
                      onClick={() => {
                        setAsset({ symbol: r.symbol, type: r.type, name: r.name });
                        setQuery("");
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-panel-2"
                    >
                      <span className="font-mono font-semibold">{r.symbol}</span> <span className="text-muted">{r.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Bedrag in €" className={input} />
          <Button variant={side === "buy" ? "bull" : "primary"} onClick={() => submit()} disabled={busy || !asset} className="h-10 shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : side === "buy" ? "Koop" : "Verkoop"}
          </Button>
        </div>
        {side === "buy" && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[1000, 5000, 10000, 25000].map((v) => (
              <button key={v} onClick={() => setAmount(String(v))} className="rounded-full border border-border px-2.5 py-1 text-muted hover:text-text">
                € {v.toLocaleString("nl-NL")}
              </button>
            ))}
          </div>
        )}
        {side === "sell" && held && (
          <Button variant="ghost" onClick={() => submit(true)} disabled={busy}>
            Alles verkopen
          </Button>
        )}
        {msg && <p className={cn("text-sm", msg.ok ? "text-bull" : "text-bear")}>{msg.text}</p>}
      </CardBody>
    </Card>
  );
}

function ResetButton({ onDone }: { onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>Alles wissen en opnieuw beginnen met € 100.000?</span>
      <Button
        variant="primary"
        onClick={async () => {
          await post("/api/game/reset");
          setConfirm(false);
          onDone();
        }}
      >
        Ja, opnieuw
      </Button>
      <Button variant="ghost" onClick={() => setConfirm(false)}>
        Nee
      </Button>
    </div>
  ) : (
    <Button variant="ghost" onClick={() => setConfirm(true)}>
      <RotateCcw className="h-4 w-4" /> Opnieuw beginnen
    </Button>
  );
}
