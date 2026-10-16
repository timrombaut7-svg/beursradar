import type { Evidence, Horizon } from "@/types";
import { formatPct } from "@/lib/format";

const years = (y: number) => `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(y)} jaar`;

/** Uitleg in gewone taal van de historische toets. */
export function evidenceSentence(e: Evidence, horizon: Horizon): string {
  if (e.verdict === "insufficient") {
    return `In de afgelopen ${years(e.years)} kwam dit signaal maar ${e.samples} keer voor: te weinig om te bewijzen dat het werkt.`;
  }
  const avg = formatPct(e.avgReturn, 1, true);
  const base = formatPct(e.baselineReturn, 1, true);
  const what =
    horizon === "short"
      ? `${e.wins} van de ${e.samples} keer eindigde de trade met winst`
      : `${e.wins} van de ${e.samples} keer stond je na ± 3 maanden op winst`;
  return (
    `Getest op de afgelopen ${years(e.years)}: dit signaal kwam ${e.samples} keer voor en ${what}. ` +
    `Gemiddeld ${avg} per keer, tegenover ${base} als je op een willekeurige dag was ingestapt.`
  );
}

/** Korte reden waarom een koopsignaal de toets niet haalde. */
export function rejectionReason(e: Evidence): string {
  if (e.verdict === "insufficient") return `te weinig voorbeelden (${e.samples})`;
  const avg = formatPct(e.avgReturn, 1, true);
  const base = formatPct(e.baselineReturn, 1, true);
  if (e.avgReturn <= e.baselineReturn) return `deed het vroeger niet beter dan willekeurig kopen (${avg} vs ${base})`;
  return `te weinig winst of te vaak verlies (${avg} gemiddeld, ${Math.round(e.winRate * 100)}% raak)`;
}
