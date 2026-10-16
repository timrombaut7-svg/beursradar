"use client";
import Link from "next/link";
import { Trophy } from "lucide-react";
import type { Horizon } from "@/types";
import type { TrackSummary } from "@/lib/engine/trackRecord";
import { useTrackRecord } from "@/lib/hooks";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; tone: string }> = {
  target: { label: "doel gehaald", tone: "text-bull" },
  stop: { label: "stop-loss", tone: "text-bear" },
  expired: { label: "afgelopen", tone: "text-muted" },
  open: { label: "loopt nog", tone: "text-accent" },
};

const date = (iso: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(iso));

function Stat({ title, s }: { title: string; s: TrackSummary }) {
  return (
    <div className="rounded-xl bg-panel-2 p-3">
      <div className="text-xs font-semibold">{title}</div>
      {s.finished > 0 ? (
        <>
          <div className="mt-1 text-2xl font-bold tabular">{Math.round((s.winRate ?? 0) * 100)}%</div>
          <div className="text-[11px] text-muted">
            {s.wins} van {s.finished} afgeronde tips met winst · gemiddeld{" "}
            <span className={cn("font-semibold", (s.avgReturn ?? 0) >= 0 ? "text-bull" : "text-bear")}>{formatPct(s.avgReturn, 1, true)}</span>
          </div>
        </>
      ) : (
        <div className="mt-1 text-[11px] text-muted">Nog geen afgeronde tips.</div>
      )}
      {s.open > 0 && (
        <div className="mt-1 text-[11px] text-muted">
          {s.open} lopend, nu gemiddeld {formatPct(s.avgOpenReturn, 1, true)}
        </div>
      )}
    </div>
  );
}

/** Eerlijk scorebord: elke getoonde tip wordt bewaard en achteraf nagekeken. */
export function TrackRecord() {
  const { data, isLoading } = useTrackRecord();
  if (isLoading) return <Skeleton className="h-48" />;
  if (!data?.enabled) return null;

  const recent = data.tips.slice(0, 12);
  const termNl: Record<Horizon, string> = { short: "kort", long: "lang" };
  return (
    <Card>
      <CardHeader
        icon={<Trophy className="h-4 w-4" />}
        title="Scorebord: hoe goed waren onze tips?"
        subtitle={data.since ? `Elke tip wordt bewaard en achteraf nagekeken met de echte koersen, sinds ${date(data.since)}.` : "Vanaf nu wordt elke tip bewaard en achteraf nagekeken."}
      />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat title="Korte termijn" s={data.summary.short} />
          <Stat title="Lange termijn" s={data.summary.long} />
        </div>
        {recent.length > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <Link href={`/asset/${t.type}/${t.symbol}`} className="font-mono font-semibold hover:text-accent">
                    {t.symbol}
                  </Link>{" "}
                  <span className="text-[11px] text-muted">
                    {date(t.createdAt)} · {termNl[t.horizon]}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  <span className={STATUS[t.status].tone}>{STATUS[t.status].label}</span>
                  <span className={cn("w-14 text-right font-mono tabular", t.ret >= 0 ? "text-bull" : "text-bear")}>{formatPct(t.ret, 1, true)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Zodra de app tips geeft, zie je hier hoe ze uitpakken.</p>
        )}
        <p className="text-[11px] text-muted">
          Korte termijn: winst als het eerste koersdoel gehaald werd, verlies bij de stop-loss, anders na 40 beursdagen de balans.
          Lange termijn: de balans na ± 3 maanden, of eerder bij de stop-loss.
        </p>
      </CardBody>
    </Card>
  );
}
