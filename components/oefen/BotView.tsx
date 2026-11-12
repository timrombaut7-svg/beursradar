"use client";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Bot, ListOrdered } from "lucide-react";
import { useBot } from "@/lib/hooks";
import { BOT_RULES } from "@/lib/engine/paper";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEur, formatPct, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const eur = formatEur;
/** Kleur bij winst/verlies; afrondingsruis (−0,00%) blijft neutraal */
const tone = (v: number, eps = 1e-4) => (v > eps ? "text-bull" : v < -eps ? "text-bear" : "");
const when = (t: number) => new Date(t).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** De trading bot: beheert zelfstandig € 100.000 nepgeld en probeert zo snel mogelijk winst te maken. */
export function BotView() {
  const { data: b, isLoading, isError, error } = useBot();
  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !b) return <p className="text-sm text-bear">De bot kon niet geladen worden: {(error as Error)?.message}</p>;

  const winRate = b.stats.closed ? b.stats.wins / b.stats.closed : null;
  const stats = [
    { label: "Waarde", value: eur(b.equityEur), tone: "" },
    { label: "Rendement", value: formatPct(b.returnPct, 2, true), tone: tone(b.returnPct) },
    { label: "Gerealiseerd", value: `${b.stats.realizedEur >= 0 ? "+" : ""}${eur(b.stats.realizedEur)}`, tone: tone(b.stats.realizedEur) },
    { label: "Winnende trades", value: winRate === null ? "—" : `${b.stats.wins}/${b.stats.closed} (${Math.round(winRate * 100)}%)`, tone: "" },
  ];
  const up = b.equity[b.equity.length - 1]?.v >= b.startEur;

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

      <Card>
        <CardHeader
          icon={<Activity className="h-4 w-4" />}
          title="Waarde van de bot"
          subtitle={b.lastRunAt ? `Laatste ronde ${timeAgo(b.lastRunAt)} · elke 10 minuten een nieuwe ronde` : "De eerste ronde begint binnen 10 minuten"}
        />
        <CardBody>
          {b.equity.length > 2 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={b.equity} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
                  <YAxis domain={["auto", "auto"]} width={64} tickFormatter={(v: number) => `€${(v / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}k`} tick={{ fontSize: 11, fill: "var(--muted)" }} />
                  <Tooltip
                    formatter={(v) => eur(Number(v))}
                    labelFormatter={(t) => when(Number(t))}
                    contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="v" name="Waarde" stroke={up ? "var(--bull)" : "var(--bear)"} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted">De grafiek verschijnt na een paar rondes (elke 10 minuten één).</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Bot className="h-4 w-4" />} title={`Open posities (${b.positions.length}/${BOT_RULES.maxPositions})`} subtitle={`Cash: ${eur(b.cashEur)}`} />
        {b.positions.length === 0 ? (
          <p className="p-4 text-sm text-muted">De bot heeft nu niets in bezit. Hij koopt zodra iets met een koopsignaal vandaag stijgt (aandelen alleen als de beurs open is).</p>
        ) : (
          <ul className="divide-y divide-border">
            {b.positions.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/asset/${p.type}/${p.symbol}`} className="min-w-0 truncate text-sm font-medium">
                    <span className="font-mono">{p.symbol}</span> <span className="text-muted">{p.name}</span>
                  </Link>
                  <span className={cn("shrink-0 font-mono text-sm font-semibold tabular", tone(p.pnlPct))}>{formatPct(p.pnlPct, 1, true)}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted">
                  <span>waarde {eur(p.valueEur)}</span>
                  <span>instap {eur(p.entryPriceEur)}</span>
                  <span className="text-bear">stop {eur(p.stopLossEur)}</span>
                  <span className="text-bull">
                    doel {eur(p.partialTaken ? p.target2Eur : p.target1Eur)}
                    {p.partialTaken && " (helft al verkocht)"}
                  </span>
                  <span>sinds {when(p.openedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader icon={<ListOrdered className="h-4 w-4" />} title="Wat de bot deed" subtitle="Elke aan- en verkoop, met de reden" />
        {b.trades.length === 0 ? (
          <p className="p-4 text-sm text-muted">Nog geen trades.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {b.trades.map((t) => (
              <li key={t.id} className="px-4 py-2.5">
                <div className="flex justify-between gap-3">
                  <span>
                    <span className={t.side === "buy" ? "text-bull" : "text-bear"}>{t.side === "buy" ? "Kocht" : "Verkocht"}</span>{" "}
                    <span className="font-mono">{t.symbol}</span> voor {eur(t.quantity * t.priceEur)}
                  </span>
                  {t.pnlEur !== null && (
                    <span className={cn("shrink-0 font-mono text-xs font-semibold tabular", tone(t.pnlEur))}>
                      {t.pnlEur >= 0 ? "+" : ""}
                      {eur(t.pnlEur)}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted">
                  {t.reason} · {when(t.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Hoe werkt de bot?" />
        <CardBody>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Hij is een daytrader: hij begon met € 100.000 nepgeld en handelt helemaal zelf, elke 10 minuten, tegen echte live koersen (0,1% kosten per order).</li>
            <li>
              Hij koopt aandelen en crypto met een koopsignaal die vandaag al stijgen (tussen +{BOT_RULES.minDayChangePct}% en +{BOT_RULES.maxDayChangePct}%), maximaal{" "}
              {BOT_RULES.maxPositions} tegelijk, elk {BOT_RULES.positionPct * 100}% van zijn geld.
            </li>
            <li>
              Kleine winstjes: bij +{(BOT_RULES.target1Pct * 100).toLocaleString("nl-NL")}% verkoopt hij de helft en zet hij de stop net boven zijn instapprijs; bij +
              {(BOT_RULES.target2Pct * 100).toLocaleString("nl-NL")}% verkoopt hij alles.
            </li>
            <li>Bij −{(BOT_RULES.stopPct * 100).toLocaleString("nl-NL")}% gaat hij er meteen uit, ook als het signaal omslaat. Na een dag houdt hij niets meer vast.</li>
            <li>Na een verkoop koopt hij hetzelfde aandeel {BOT_RULES.cooldownMinutes / 60} uur niet terug. Aandelen handelt hij alleen als hun beurs open is, crypto 24/7.</li>
          </ul>
          <p className="mt-2 text-xs text-muted">
            Een bot die winst probeert te maken kan ook verlies maken. Dit is nepgeld om te leren: geen garantie en geen advies.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
