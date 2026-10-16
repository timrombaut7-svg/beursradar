import type { Analysis, Horizon, HoldEstimate, Opportunity, ScoreFactor, SignalExplanation } from "@/types";
import { ADVICE_META, formatPct, formatPrice } from "@/lib/format";
import { HORIZON_WEIGHTS } from "./scoring";

/**
 * Uitleg in makkelijke taal. Elke zin hoort bij een factor uit de beslissingsmatrix,
 * zodat de uitleg altijd klopt met de score: er wordt niets verzonnen.
 */

type Phrase = string | ((f: ScoreFactor, a: Analysis) => string);
const PHRASES: Record<string, { up?: Phrase; down?: Phrase; strongUp?: Phrase; strongDown?: Phrase }> = {
  "technical:rsi": {
    strongUp: "De koers is de laatste tijd flink gezakt. Vaak volgt daarna een opleving.",
    up: "De koers heeft gezonde vaart naar boven, zonder oververhit te zijn.",
    down: "De koers heeft op dit moment weinig vaart.",
    strongDown: "De koers is heel snel gestegen; er kan een terugval komen.",
  },
  "technical:macd": {
    strongUp: "De koers is net weer gaan stijgen na een dip.",
    up: "De koers beweegt de laatste dagen omhoog.",
    down: "De koers beweegt de laatste dagen omlaag.",
    strongDown: "De koers is net gaan dalen na een stijging.",
  },
  "technical:ema20": {
    up: "De koers ligt hoger dan het gemiddelde van de afgelopen weken.",
    down: "De koers ligt lager dan het gemiddelde van de afgelopen weken.",
  },
  "technical:macross": {
    strongUp: "De koers is net in een stijgende trend voor de lange termijn gekomen.",
    up: "De koers zit al maanden in een stijgende lijn.",
    down: "De koers zit al maanden in een dalende lijn.",
    strongDown: "De koers is net in een dalende trend voor de lange termijn terechtgekomen.",
  },
  "technical:ema200": {
    up: "De koers ligt hoger dan het gemiddelde van het afgelopen jaar.",
    down: "De koers ligt lager dan het gemiddelde van het afgelopen jaar.",
  },
  "technical:bb": {
    up: "De koers is ongewoon ver gezakt vergeleken met normaal; dat herstelt vaak.",
    down: "De koers staat ongewoon hoog vergeleken met normaal.",
  },
  "technical:sr": {
    up: "De koers zit net boven een prijs waar hij eerder steeds weer omhoog veerde. Een goed instapmoment.",
    down: "De koers zit tegen een prijs waar hij eerder steeds weer terugviel.",
  },
  "fundamental:pe": {
    up: "Het aandeel is niet duur vergeleken met de winst die het bedrijf maakt.",
    down: (f) => (f.points <= -2 ? "Het bedrijf maakt verlies." : "Het aandeel is duur vergeleken met de winst van het bedrijf."),
  },
  "fundamental:peg": { up: "Je betaalt een redelijke prijs voor de groei van het bedrijf.", down: "Je betaalt veel voor de groei van het bedrijf." },
  "fundamental:revgrowth": {
    up: (f) => `De omzet van het bedrijf groeit (${f.value} per jaar).`,
    down: (f) => `De omzet van het bedrijf krimpt (${f.value}).`,
  },
  "fundamental:eps": { up: "Het bedrijf maakt winst.", down: "Het bedrijf maakt verlies." },
  "fundamental:de": { up: "Het bedrijf heeft weinig schulden.", down: "Het bedrijf heeft veel schulden." },
  "fundamental:fcf": { up: "Het bedrijf houdt geld over.", down: "Het bedrijf geeft meer geld uit dan het binnenkrijgt." },
  "fundamental:div": { up: (f) => `Je krijgt een mooi dividend (${f.value} per jaar).` },
  "fundamental:analyst": {
    up: "De meeste professionele analisten raden aan om te kopen.",
    down: "Professionele analisten zijn eerder negatief.",
  },
  "fundamental:target": {
    up: (f) => `Analisten verwachten dat de koers nog stijgt (${f.value.replace("upside", "erbij")}).`,
    down: "Analisten verwachten dat de koers daalt.",
  },
  "fundamental:inflation": {
    up: "Er komen weinig nieuwe munten bij, dus ze blijven schaars.",
    down: "Er komen veel nieuwe munten bij; dat drukt de prijs.",
  },
  "fundamental:supply": {
    up: "Bijna alle munten zijn al in omloop; weinig risico op extra aanbod.",
    down: "Veel munten moeten nog vrijkomen; dat kan de prijs drukken.",
  },
  "fundamental:fdv": { down: "Er komen in de toekomst nog veel munten op de markt." },
  "fundamental:mvrv": {
    up: "De prijs is laag vergeleken met wat beleggers er gemiddeld voor betaalden.",
    down: "De prijs is hoog vergeleken met wat beleggers er gemiddeld voor betaalden.",
  },
  "fundamental:rank": { up: "Het is een van de grootste munten: veel handel en vertrouwen.", down: "Het is een kleine munt, met meer risico." },
  "fundamental:network": { up: "Steeds meer mensen gebruiken het netwerk.", down: "Minder mensen gebruiken het netwerk." },
  "sentiment:fng": {
    up: "Veel beleggers zijn nu bang. Historisch is dat vaak een goed moment om te kopen.",
    down: "Veel beleggers zijn nu hebzuchtig; dan is de kans op een terugval groter.",
  },
  "sentiment:news": { up: "Het nieuws is de laatste dagen vooral positief.", down: "Het nieuws is de laatste dagen vooral negatief." },
  "sentiment:rates": { up: "De rente daalt; dat is meestal goed voor beleggingen.", down: "De rente stijgt; dat drukt meestal de koersen." },
  "sentiment:inflation": { up: "De inflatie daalt.", down: "De inflatie stijgt." },
  "sentiment:btcdom": {
    up: (_f, a) =>
      a.asset.symbol === "BTC" ? "Beleggers stoppen hun geld nu vooral in Bitcoin." : "Er is ruimte voor kleinere munten om te stijgen.",
    down: "Beleggers kiezen nu vooral voor Bitcoin; kleinere munten blijven dan vaak achter.",
  },
  "risk:vol": { up: "De koers schommelt weinig: rustig bezit.", down: "De koers schommelt sterk; reken op grote uitschieters." },
  "risk:beta": { up: "Het beweegt minder heftig dan de rest van de markt.", down: "Het beweegt heftiger dan de rest van de markt." },
  "risk:mdd": {
    up: "De koers zakte het afgelopen jaar nooit erg ver.",
    down: (f) => `Het afgelopen jaar zakte de koers tussendoor tot ${f.value}. Het kan dus hard dalen.`,
  },
  "risk:sharpe": {
    up: "Het rendement was het afgelopen jaar goed voor het risico.",
    down: "Het afgelopen jaar leverde het weinig op voor het risico.",
  },
};

/** Nederlandse notatie voor getallen in een waarde: "-48.8%" → "-48,8%". */
const nl = (s: string) => s.replace(/(\d)\.(\d)/g, "$1,$2");

export function easySentence(f: ScoreFactor, a: Analysis): string | null {
  if (f.points === 0) return null;
  const p = PHRASES[`${f.pillar}:${f.id}`];
  const strong = Math.abs(f.points) >= Math.max(2, f.maxPoints);
  const phrase = f.points > 0 ? (strong && p?.strongUp) || p?.up : (strong && p?.strongDown) || p?.down;
  if (!phrase) return f.explanation;
  return typeof phrase === "function" ? phrase({ ...f, value: nl(f.value) }, a) : phrase;
}

function impact(f: ScoreFactor, horizon: Horizon) {
  return (f.points / f.maxPoints) * HORIZON_WEIGHTS[horizon][f.pillar];
}

function reasons(a: Analysis, horizon: Horizon) {
  const factors = Object.values(a.pillars)
    .flatMap((p) => p.factors)
    .filter((f) => f.horizons.includes(horizon) && f.points !== 0);
  const pick = (list: ScoreFactor[], n: number) =>
    [...new Set(list.map((f) => easySentence(f, a)).filter((s): s is string => Boolean(s)))].slice(0, n);
  return {
    why: pick(factors.filter((f) => f.points > 0).sort((x, y) => impact(y, horizon) - impact(x, horizon)), 4),
    risks: pick(factors.filter((f) => f.points < 0).sort((x, y) => impact(x, horizon) - impact(y, horizon)), 2),
  };
}

const DAY_PACE = 0.35; // gemiddelde netto koerswinst per dag in een trend, in ATR's (schatting)

/**
 * Schat hoe lang het duurt om koersdoel 1 en 2 te halen: afstand ÷ (gemiddelde
 * dagbeweging × tempo). Aandelen handelen 5 van de 7 dagen.
 */
export function estimateHold(a: Analysis, horizon: Horizon, plan: Opportunity["plan"]): HoldEstimate {
  if (horizon === "long") return { label: "maanden tot jaren", minDays: null, maxDays: null };
  const atr = a.technical.atr && a.technical.atr > 0 ? a.technical.atr : a.quote.price * 0.02;
  const entry = (plan.entryLow + plan.entryHigh) / 2;
  const tradingDays = (target: number | null) =>
    target ? Math.min(40, Math.max(3, Math.round(Math.abs(target - entry) / (atr * DAY_PACE)))) : 20;
  const toCalendar = (d: number) => (a.asset.type === "crypto" ? d : Math.round((d * 7) / 5));
  const minDays = toCalendar(tradingDays(plan.target1));
  const maxDays = Math.max(minDays, toCalendar(tradingDays(plan.target2)));
  return { label: daysLabel(minDays, maxDays), minDays, maxDays };
}

export function daysLabel(min: number, max: number): string {
  if (max < 10) return min === max ? `± ${min} dagen` : `± ${min}–${max} dagen`;
  const w = (d: number) => Math.max(1, Math.round(d / 7));
  const [a, b] = [w(min), w(max)];
  return a === b ? `± ${a} ${a === 1 ? "week" : "weken"}` : `± ${a}–${b} weken`;
}

/** Plan voor lange termijn: kopen rond de koers, ruime noodrem-stop, geen vaste koersdoelen. */
export function longTermPlan(a: Analysis): Opportunity["plan"] {
  const price = a.quote.price;
  // ± 1,5 standaarddeviatie over 3 maanden, begrensd tussen 12% en 40%
  const dist = Math.min(0.4, Math.max(0.12, 1.5 * a.risk.volatility30d * Math.sqrt(63 / 252)));
  return { entryLow: price * 0.98, entryHigh: price, stopLoss: price * (1 - dist), target1: null, target2: null, riskPct: dist };
}

export function shortTermPlan(a: Analysis): Opportunity["plan"] {
  const p = a.tradePlan;
  return { entryLow: p.entryLow, entryHigh: p.entryHigh, stopLoss: p.stopLoss, target1: p.target1, target2: p.target2, riskPct: p.riskPct };
}

export function explainEasy(a: Analysis, horizon: Horizon, plan: Opportunity["plan"], hold: HoldEstimate): SignalExplanation {
  const cur = a.asset.currency;
  const name = a.asset.name;
  const verdict = horizon === "short" ? a.shortTerm : a.longTerm;
  const strong = ADVICE_META[verdict.advice].strong;
  const headline =
    horizon === "short"
      ? `${name} lijkt nu ${strong ? "een sterke" : "een goede"} koop voor de komende weken.`
      : `${name} lijkt ${strong ? "een sterke" : "een goede"} belegging om langere tijd vast te houden.`;

  const { why, risks } = reasons(a, horizon);
  const mid = (plan.entryLow + plan.entryHigh) / 2;
  const plan_ =
    horizon === "short" && plan.target1 && plan.target2
      ? `Kopen tussen ${formatPrice(plan.entryLow, cur)} en ${formatPrice(plan.entryHigh, cur)}. ` +
        `Zakt de koers onder ${formatPrice(plan.stopLoss, cur)}, verkoop dan; je verliest dan ongeveer ${formatPct(plan.riskPct, 0)}. ` +
        `Eerste doel: ${formatPrice(plan.target1, cur)} (${formatPct(plan.target1 / mid - 1, 1, true)}), ` +
        `daarna ${formatPrice(plan.target2, cur)} (${formatPct(plan.target2 / mid - 1, 1, true)}).`
      : `Kopen rond de huidige koers (${formatPrice(a.quote.price, cur)}). ` +
        `Zakt de koers onder ${formatPrice(plan.stopLoss, cur)} (${formatPct(-plan.riskPct, 0)}), verkoop dan om grote verliezen te voorkomen. ` +
        `Er is geen vast koersdoel: je houdt zolang het signaal voor de lange termijn positief blijft.`;

  const hold_ =
    horizon === "short"
      ? `Houd het ${hold.label} vast. Verkoop eerder als de app "Verkopen" zegt, en neem winst als het eerste doel gehaald is.`
      : `Houd het minstens een paar maanden vast, mogelijk jaren, zolang de app niet "Verkopen" zegt. Koersen kunnen onderweg flink schommelen.`;

  return { headline, why, risks, plan: plan_, hold: hold_ };
}
