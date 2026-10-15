import type { ScoreFactor } from "@/types";
import { cn } from "@/lib/utils";

/** Transparante weergave van de beslissingsmatrix: elke factor met punten. */
export function FactorList({ factors }: { factors: ScoreFactor[] }) {
  if (!factors.length) return <p className="text-sm text-muted">Geen factoren beschikbaar.</p>;
  return (
    <ul className="divide-y divide-border">
      {factors.map((f) => (
        <li key={f.id} className="flex items-start gap-3 py-2.5">
          <span
            className={cn(
              "mt-0.5 w-11 shrink-0 rounded-md py-0.5 text-center font-mono text-xs font-bold tabular",
              f.points > 0 ? "bg-bull/15 text-bull" : f.points < 0 ? "bg-bear/15 text-bear" : "bg-panel-2 text-muted",
            )}
            title={`max ±${f.maxPoints}`}
          >
            {f.points > 0 ? "+" : ""}
            {f.points}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-medium">{f.label}</span>
              <span className="font-mono text-xs tabular text-muted">{f.value}</span>
            </div>
            <p className="text-xs text-muted">
              {f.explanation}
              <span className="ml-1 text-[10px] uppercase opacity-70">
                · {f.horizons.map((h) => (h === "short" ? "KT" : "LT")).join("/")}
              </span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
