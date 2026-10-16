import type { Analysis, Pillar, ScoreFactor, SignalExplanation } from "@/types";
import { ADVICE_META, formatPct, formatPrice } from "@/lib/format";
import { HORIZON_WEIGHTS } from "./scoring";

const PILLAR_NL: Record<Pillar, string> = {
  technical: "de technische analyse",
  fundamental: "de fundamentele analyse",
  sentiment: "het sentiment",
  risk: "het risicoprofiel",
};

/** Hoeveel een factor bijdraagt aan de korte-termijnscore (punten × weging van de pijler). */
function impact(f: ScoreFactor) {
  return (f.points / f.maxPoints) * HORIZON_WEIGHTS.short[f.pillar];
}

const toItem = (f: ScoreFactor) => ({ title: f.label, value: f.value, detail: f.explanation });

/**
 * Legt in gewone taal uit waarom een asset het signaal krijgt dat het krijgt.
 * Alles komt uit dezelfde beslissingsmatrix als de score: niets wordt verzonnen.
 */
export function explainSignal(a: Analysis): SignalExplanation {
  const v = a.shortTerm;
  const cur = a.asset.currency;
  const factors = Object.values(a.pillars)
    .flatMap((p) => p.factors)
    .filter((f) => f.horizons.includes("short"));

  const pros = factors.filter((f) => f.points > 0).sort((x, y) => impact(y) - impact(x)).slice(0, 4).map(toItem);
  const cons = factors.filter((f) => f.points < 0).sort((x, y) => impact(x) - impact(y)).slice(0, 3).map(toItem);

  const meta = ADVICE_META[v.advice];
  const sentences: string[] = [
    `${a.asset.name} krijgt een ${meta.nl}-signaal (${v.score > 0 ? "+" : ""}${v.score} op een schaal van −100 tot +100) voor de komende 1–4 weken.`,
  ];

  // Rangschik pijlers op hun werkelijke bijdrage aan de score (score × weging),
  // zodat de samenvatting klopt met de argumenten hieronder
  const contribution = (p: Pillar) => v.pillarScores[p] * v.weights[p];
  const drivers = (Object.keys(v.pillarScores) as Pillar[])
    .filter((p) => v.pillarScores[p] >= 20)
    .sort((x, y) => contribution(y) - contribution(x))
    .slice(0, 2);
  if (drivers.length === 2) sentences.push(`Vooral ${PILLAR_NL[drivers[0]]} en ${PILLAR_NL[drivers[1]]} zijn positief.`);
  else if (drivers.length === 1) sentences.push(`Vooral ${PILLAR_NL[drivers[0]]} is positief.`);
  else sentences.push("De signalen zijn licht positief, zonder één uitschieter.");

  const p = a.tradePlan;
  if (p.direction === "long") {
    const mid = (p.entryLow + p.entryHigh) / 2;
    sentences.push(
      `Plan: kopen tussen ${formatPrice(p.entryLow, cur)} en ${formatPrice(p.entryHigh, cur)}, stop-loss op ${formatPrice(p.stopLoss, cur)} ` +
        `(${formatPct(p.riskPct, 1)} risico), eerste koersdoel ${formatPrice(p.target1, cur)} (${formatPct(p.target1 / mid - 1, 1, true)}).`,
    );
  }

  const lt = ADVICE_META[a.longTerm.advice];
  if (a.longTerm.score >= 15) sentences.push(`Ook op lange termijn is het beeld positief (${lt.nl}).`);
  else if (a.longTerm.score <= -15) sentences.push(`Let op: op lange termijn is het signaal ${lt.nl}; dit is vooral een korte-termijnkans.`);

  return { summary: sentences.join(" "), pros, cons };
}
