import type {
  Advice,
  AssetType,
  CryptoFundamentals,
  FearGreed,
  Fundamentals,
  Horizon,
  HorizonVerdict,
  MacroData,
  Pillar,
  PillarScore,
  PriceLevel,
  RiskMetrics,
  ScoreFactor,
  StockFundamentals,
} from "@/types";
import { isSqueeze, lastCross } from "@/lib/indicators";
import type { IndicatorSeries } from "./technical";

/**
 * ============================================================================
 *  BESLISSINGSMATRIX
 * ============================================================================
 *  Elke factor kent punten toe binnen [-maxPoints, +maxPoints]. Per pijler wordt
 *  de som genormaliseerd naar -100..+100. De eindscore per horizon is een
 *  gewogen gemiddelde van de pijlers. Alles is transparant: de UI toont elke
 *  factor met zijn punten en uitleg.
 * ============================================================================
 */

const BOTH: Horizon[] = ["short", "long"];
const SHORT: Horizon[] = ["short"];
const LONG: Horizon[] = ["long"];

export const HORIZON_WEIGHTS: Record<Horizon, Record<Pillar, number>> = {
  short: { technical: 0.5, sentiment: 0.25, risk: 0.15, fundamental: 0.1 },
  long: { fundamental: 0.45, technical: 0.2, risk: 0.25, sentiment: 0.1 },
};

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const fx = (v: number, digits = 2) => v.toFixed(digits);

function factor(
  pillar: Pillar,
  id: string,
  label: string,
  value: string,
  points: number,
  maxPoints: number,
  horizons: Horizon[],
  explanation: string,
): ScoreFactor {
  return { pillar, id, label, value, points, maxPoints, horizons, explanation };
}

// ---------------------------------------------------------------------------
// Technische Analyse
// ---------------------------------------------------------------------------

export function technicalFactors(
  s: IndicatorSeries,
  i: number,
  levels?: { supports: PriceLevel[]; resistances: PriceLevel[] },
): ScoreFactor[] {
  const f: ScoreFactor[] = [];
  const price = s.closes[i];
  const T = "technical" as const;

  const r = s.rsi[i];
  if (r !== null) {
    if (r < 30) f.push(factor(T, "rsi", "RSI (14)", fx(r, 1), 2, 2, SHORT, "Oversold (< 30): verkoopdruk is uitgeput, kans op technisch herstel."));
    else if (r > 70) f.push(factor(T, "rsi", "RSI (14)", fx(r, 1), -2, 2, SHORT, "Overbought (> 70): koopdruk is oververhit, kans op correctie."));
    else if (r >= 50) f.push(factor(T, "rsi", "RSI (14)", fx(r, 1), 1, 2, SHORT, "Neutraal-positief momentum (50–70)."));
    else f.push(factor(T, "rsi", "RSI (14)", fx(r, 1), -1, 2, SHORT, "Neutraal-negatief momentum (30–50)."));
  }

  const hist = s.macdHist[i];
  if (hist !== null) {
    const cross = lastCross(s.macd, s.macdSignal, i, 5);
    if (cross?.direction === "up")
      f.push(factor(T, "macd", "MACD crossover", `bullish, ${cross.barsAgo} bars geleden`, 2, 2, SHORT, "MACD kruiste recent boven de signaallijn: momentum draait positief."));
    else if (cross?.direction === "down")
      f.push(factor(T, "macd", "MACD crossover", `bearish, ${cross.barsAgo} bars geleden`, -2, 2, SHORT, "MACD kruiste recent onder de signaallijn: momentum draait negatief."));
    else
      f.push(factor(T, "macd", "MACD histogram", fx(hist, 3), hist > 0 ? 1 : -1, 2, SHORT, hist > 0 ? "MACD boven signaallijn: positief momentum." : "MACD onder signaallijn: negatief momentum."));
  }

  const e20 = s.ema20[i];
  if (e20 !== null) {
    const above = price > e20;
    f.push(factor(T, "ema20", "Prijs vs EMA 20", `${pct(price / e20 - 1)}`, above ? 1 : -1, 1, SHORT, above ? "Prijs boven korte-termijn trend (EMA 20)." : "Prijs onder korte-termijn trend (EMA 20)."));
  }

  const e50 = s.ema50[i];
  const e200 = s.ema200[i];
  if (e50 !== null && e200 !== null) {
    const cross = lastCross(s.ema50, s.ema200, i, 30);
    if (cross?.direction === "up")
      f.push(factor(T, "macross", "Golden Cross", `EMA50 > EMA200 (${cross.barsAgo} bars)`, 3, 3, BOTH, "EMA 50 kruiste recent boven EMA 200: klassiek lange-termijn koopsignaal."));
    else if (cross?.direction === "down")
      f.push(factor(T, "macross", "Death Cross", `EMA50 < EMA200 (${cross.barsAgo} bars)`, -3, 3, BOTH, "EMA 50 kruiste recent onder EMA 200: klassiek lange-termijn verkoopsignaal."));
    else
      f.push(factor(T, "macross", "Trendstructuur", e50 > e200 ? "EMA50 > EMA200" : "EMA50 < EMA200", e50 > e200 ? 2 : -2, 3, BOTH, e50 > e200 ? "Opwaartse trendstructuur (50 boven 200)." : "Neerwaartse trendstructuur (50 onder 200)."));
  }
  if (e200 !== null) {
    const above = price > e200;
    f.push(factor(T, "ema200", "Prijs vs EMA 200", pct(price / e200 - 1), above ? 2 : -2, 2, LONG, above ? "Prijs boven de lange-termijn trendlijn." : "Prijs onder de lange-termijn trendlijn."));
  }

  const pb = s.bbPercentB[i];
  if (pb !== null) {
    const squeeze = isSqueeze(s.bbWidth, i);
    if (pb < 0) f.push(factor(T, "bb", "Bollinger Bands", `%B ${fx(pb)}`, 1, 1, SHORT, "Slot onder de onderste band: statistisch oververkocht (mean-reversion kans)."));
    else if (pb > 1) f.push(factor(T, "bb", "Bollinger Bands", `%B ${fx(pb)}`, -1, 1, SHORT, "Slot boven de bovenste band: statistisch overgekocht."));
    else f.push(factor(T, "bb", "Bollinger Bands", `%B ${fx(pb)}${squeeze ? " · squeeze" : ""}`, 0, 1, SHORT, squeeze ? "Volatiliteit-squeeze: banden zijn smal, een uitbraak (richting onbekend) is waarschijnlijk." : "Prijs binnen de banden."));
  }

  if (levels) {
    const sup = levels.supports[0];
    const res = levels.resistances[0];
    const dSup = sup ? (price - sup.price) / price : Infinity;
    const dRes = res ? (res.price - price) / price : Infinity;
    if (dSup < 0.03 && dSup <= dRes)
      f.push(factor(T, "sr", "Support/Resistance", `${pct(dSup)} boven support`, 1, 1, SHORT, "Prijs dicht bij support: gunstig instapniveau met strakke stop."));
    else if (dRes < 0.03)
      f.push(factor(T, "sr", "Support/Resistance", `${pct(dRes)} onder weerstand`, -1, 1, SHORT, "Prijs tegen weerstand: beperkte opwaartse ruimte op korte termijn."));
    else f.push(factor(T, "sr", "Support/Resistance", "midden in range", 0, 1, SHORT, "Geen nabijgelegen kritisch niveau."));
  }
  return f;
}

// ---------------------------------------------------------------------------
// Fundamentele Analyse
// ---------------------------------------------------------------------------

/** `allowEstimates`: ook geschatte waarden meetellen (alleen in demo-modus). */
export function fundamentalFactors(f: Fundamentals, price: number, allowEstimates = false): ScoreFactor[] {
  return f.kind === "stock" ? stockFactors(f, price) : cryptoFactors(f, allowEstimates);
}

function stockFactors(f: StockFundamentals, price: number): ScoreFactor[] {
  const out: ScoreFactor[] = [];
  const F = "fundamental" as const;
  if (f.peRatio !== null) {
    const pe = f.peRatio;
    const pts = pe < 0 ? -2 : pe < 15 ? 2 : pe < 25 ? 1 : pe < 40 ? 0 : -1;
    out.push(factor(F, "pe", "Koers/winst (P/E)", fx(pe, 1), pts, 2, LONG, pe < 0 ? "Negatieve winst." : pe < 15 ? "Goedkoop gewaardeerd." : pe < 25 ? "Redelijke waardering." : pe < 40 ? "Premium waardering." : "Zeer hoge waardering: veel groei ingeprijsd."));
  }
  if (f.pegRatio !== null && f.pegRatio > 0) {
    const peg = f.pegRatio;
    const pts = peg < 1 ? 2 : peg < 2 ? 1 : peg < 3 ? 0 : -1;
    out.push(factor(F, "peg", "PEG ratio", fx(peg), pts, 2, LONG, peg < 1 ? "Groei is goedkoop geprijsd (PEG < 1)." : peg < 2 ? "Groei redelijk geprijsd." : "Groei duur geprijsd."));
  }
  if (f.revenueGrowthYoY !== null) {
    const g = f.revenueGrowthYoY;
    const pts = g > 0.2 ? 2 : g > 0.08 ? 1 : g >= 0 ? 0 : -2;
    out.push(factor(F, "revgrowth", "Omzetgroei (YoY)", pct(g), pts, 2, LONG, g > 0.2 ? "Sterke omzetgroei." : g > 0.08 ? "Gezonde omzetgroei." : g >= 0 ? "Vlakke omzet." : "Krimpende omzet."));
  }
  if (f.eps !== null) {
    out.push(factor(F, "eps", "Winst per aandeel (EPS)", fx(f.eps), f.eps > 0 ? 1 : -1, 1, LONG, f.eps > 0 ? "Winstgevend." : "Verlieslatend."));
  }
  if (f.debtToEquity !== null) {
    const de = f.debtToEquity;
    const pts = de < 50 ? 1 : de < 150 ? 0 : de < 250 ? -1 : -2;
    out.push(factor(F, "de", "Schuld/Eigen vermogen", `${fx(de / 100)}x`, pts, 2, LONG, de < 50 ? "Lage schuldenlast." : de < 150 ? "Gemiddelde schuldenlast." : "Hoge schuldenlast."));
  }
  if (f.freeCashFlow !== null) {
    out.push(factor(F, "fcf", "Free Cash Flow", compact(f.freeCashFlow), f.freeCashFlow > 0 ? 1 : -1, 1, LONG, f.freeCashFlow > 0 ? "Genereert vrije kasstroom." : "Verbrandt kasstroom."));
  }
  if (f.dividendYield !== null && f.dividendYield > 0) {
    out.push(factor(F, "div", "Dividendrendement", pct(f.dividendYield, 2), f.dividendYield > 0.02 ? 1 : 0, 1, LONG, f.dividendYield > 0.02 ? "Aantrekkelijk dividend." : "Beperkt dividend."));
  }
  const a = f.analyst;
  if (a.recommendationMean !== null) {
    const m = a.recommendationMean;
    const pts = m <= 2 ? 2 : m <= 2.5 ? 1 : m <= 3.5 ? 0 : -2;
    out.push(factor(F, "analyst", "Analisten-consensus", `${fx(m, 1)} (${a.numberOfAnalysts ?? "?"} analisten)`, pts, 2, BOTH, "Schaal 1 (strong buy) – 5 (strong sell)."));
  }
  if (a.targetMeanPrice !== null) {
    const up = a.targetMeanPrice / price - 1;
    out.push(factor(F, "target", "Koersdoel analisten", `${pct(up)} upside`, up > 0.15 ? 1 : up < -0.05 ? -1 : 0, 1, LONG, `Gemiddeld koersdoel ${fx(a.targetMeanPrice)}.`));
  }
  return out;
}

function cryptoFactors(f: CryptoFundamentals, allowEstimates: boolean): ScoreFactor[] {
  const out: ScoreFactor[] = [];
  const F = "fundamental" as const;
  if (f.annualInflation !== null) {
    const inf = f.annualInflation;
    const pts = inf < 0 ? 2 : inf <= 0.01 ? 2 : inf <= 0.03 ? 1 : inf <= 0.07 ? -1 : -2;
    out.push(factor(F, "inflation", "Supply-inflatie (jaarlijks)", pct(inf, 2), pts, 2, LONG, inf < 0 ? "Deflatoir aanbod." : inf <= 0.01 ? "Zeer lage uitgifte, schaars." : inf <= 0.03 ? "Matige uitgifte." : "Hoge uitgifte verwatert houders."));
  }
  if (f.supplyRatio !== null) {
    const r = f.supplyRatio;
    out.push(factor(F, "supply", "Circulerend / Max supply", pct(r), r > 0.85 ? 1 : r < 0.5 ? -1 : 0, 1, LONG, r > 0.85 ? "Bijna volledig uitgegeven: weinig toekomstige verwatering." : r < 0.5 ? "Veel tokens moeten nog vrijkomen." : "Gemiddelde uitgifte-fase."));
  }
  if (f.marketCap && f.fullyDilutedValuation) {
    const ratio = f.fullyDilutedValuation / f.marketCap;
    if (ratio > 1.5) out.push(factor(F, "fdv", "FDV / Marktwaarde", `${fx(ratio)}x`, -1, 1, LONG, "Grote kloof tussen FDV en marktwaarde: unlock-risico."));
  }
  if (f.mvrvZScore !== null) {
    const z = f.mvrvZScore;
    const pts = z < -0.5 ? 2 : z < 1 ? 1 : z < 2.5 ? 0 : z < 3.5 ? -1 : -2;
    out.push(factor(F, "mvrv", "MVRV Z-score (proxy)", fx(z), pts, 2, BOTH, z < -0.5 ? "Onder gerealiseerde waarde: historisch accumulatiezone." : z < 1 ? "Redelijk gewaardeerd t.o.v. gerealiseerde waarde." : z < 2.5 ? "Boven gerealiseerde waarde." : "Ver boven gerealiseerde waarde: historisch top-zone."));
  }
  if (f.marketCapRank !== null) {
    const rk = f.marketCapRank;
    out.push(factor(F, "rank", "Marktkapitalisatie-rang", `#${rk}`, rk <= 10 ? 1 : rk > 100 ? -1 : 0, 1, LONG, rk <= 10 ? "Top-10 asset: hoge liquiditeit en adoptie." : rk > 100 ? "Kleine cap: hoger idiosyncratisch risico." : "Mid-cap."));
  }
  // Netwerkactiviteit vereist betaalde on-chain data; een schatting telt niet mee
  const ch = f.network.source === "mock" && !allowEstimates ? null : f.network.activeAddressesChangePct;
  if (ch !== null) {
    out.push(factor(F, "network", "Netwerkactiviteit (30d)", `${ch > 0 ? "+" : ""}${ch.toFixed(1)}%`, ch > 5 ? 1 : ch < -5 ? -1 : 0, 1, LONG, ch > 5 ? "Groeiend aantal actieve adressen." : ch < -5 ? "Dalende netwerkactiviteit." : "Stabiele netwerkactiviteit."));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sentiment & Macro
// ---------------------------------------------------------------------------

export function sentimentFactors(
  fg: FearGreed,
  newsScore: number,
  newsCount: number,
  macro: MacroData,
  type: AssetType,
  symbol: string,
): ScoreFactor[] {
  const out: ScoreFactor[] = [];
  const S = "sentiment" as const;
  const v = fg.value;
  // Contrair: extreme angst is historisch een koopkans, extreme hebzucht een risico
  const fgPts = v < 25 ? 2 : v < 45 ? 1 : v <= 55 ? 0 : v <= 75 ? -1 : -2;
  out.push(factor(S, "fng", `Fear & Greed (${type === "crypto" ? "crypto" : "aandelen"})`, `${v} · ${fg.label}`, fgPts, 2, BOTH, "Contrair gewogen: 'be greedy when others are fearful'."));

  if (newsCount > 0) {
    const pts = newsScore > 0.2 ? 2 : newsScore > 0.05 ? 1 : newsScore < -0.2 ? -2 : newsScore < -0.05 ? -1 : 0;
    out.push(factor(S, "news", "Nieuws-sentiment (NLP)", `${newsScore >= 0 ? "+" : ""}${newsScore.toFixed(2)} (${newsCount} artikelen)`, pts, 2, SHORT, pts > 0 ? "Overwegend positieve berichtgeving." : pts < 0 ? "Overwegend negatieve berichtgeving." : "Gemengde berichtgeving."));
  }

  const ratePts = macro.rateTrend === "falling" ? 1 : macro.rateTrend === "rising" ? -1 : 0;
  out.push(factor(S, "rates", "Renteomgeving", `${macro.fedFundsRate?.toFixed(2) ?? "?"}% (${trendNl(macro.rateTrend)})`, ratePts, 1, LONG, ratePts > 0 ? "Dalende rente ondersteunt risicovolle assets." : ratePts < 0 ? "Stijgende rente drukt waarderingen." : "Stabiele rente."));

  const infPts = macro.inflationTrend === "falling" ? 1 : macro.inflationTrend === "rising" ? -1 : 0;
  out.push(factor(S, "inflation", "Inflatietrend", `${macro.inflationYoY?.toFixed(1) ?? "?"}% (${trendNl(macro.inflationTrend)})`, infPts, 1, LONG, infPts > 0 ? "Afnemende inflatie geeft centrale banken ruimte." : infPts < 0 ? "Oplopende inflatie verhoogt renterisico." : "Stabiele inflatie."));

  if (type === "crypto" && macro.btcDominance !== null) {
    const isBtc = symbol.toUpperCase() === "BTC";
    const high = macro.btcDominance > 55;
    const pts = isBtc ? (high ? 1 : 0) : high ? -1 : 1;
    out.push(factor(S, "btcdom", "Bitcoin-dominantie", `${macro.btcDominance.toFixed(1)}%`, pts, 1, BOTH, isBtc ? (high ? "Kapitaal concentreert zich in BTC." : "Neutraal voor BTC.") : high ? "Hoge BTC-dominantie: altcoins presteren doorgaans minder." : "Lage dominantie: ruimte voor 'altseason'."));
  }
  return out;
}

function trendNl(t: "rising" | "falling" | "stable") {
  return t === "rising" ? "stijgend" : t === "falling" ? "dalend" : "stabiel";
}

// ---------------------------------------------------------------------------
// Risico
// ---------------------------------------------------------------------------

export function riskFactors(r: RiskMetrics, type: AssetType): ScoreFactor[] {
  const out: ScoreFactor[] = [];
  const R = "risk" as const;
  const [lo, hi, extreme] = type === "crypto" ? [0.5, 0.9, 1.2] : [0.25, 0.5, 0.8];
  const v = r.volatility30d;
  out.push(factor(R, "vol", "Volatiliteit (30d, jaarbasis)", pct(v), v < lo ? 1 : v > extreme ? -2 : v > hi ? -1 : 0, 2, BOTH, v < lo ? "Rustig koersverloop." : v > hi ? "Zeer beweeglijk: kleinere positiegrootte aanbevolen." : "Normale volatiliteit voor deze asset-klasse."));
  if (r.beta !== null) {
    const b = r.beta;
    out.push(factor(R, "beta", `Beta t.o.v. ${r.benchmark}`, fx(b), b > 1.5 ? -1 : b < 0.8 ? 1 : 0, 1, LONG, b > 1.5 ? "Beweegt sterk mee met (en versterkt) de markt." : b < 0.8 ? "Defensief: beweegt minder dan de markt." : "Marktconform risico."));
  }
  const dd = r.maxDrawdown1y;
  out.push(factor(R, "mdd", "Max drawdown (1j)", `-${pct(dd)}`, dd > 0.5 ? -2 : dd > 0.3 ? -1 : dd < 0.15 ? 1 : 0, 2, BOTH, dd > 0.5 ? "Zeer diepe tussentijdse daling." : dd > 0.3 ? "Forse tussentijdse daling." : dd < 0.15 ? "Beperkte drawdowns." : "Gemiddelde drawdowns."));
  if (r.sharpe1y !== null) {
    const s = r.sharpe1y;
    out.push(factor(R, "sharpe", "Sharpe ratio (1j)", fx(s), s > 1 ? 1 : s < 0 ? -1 : 0, 1, LONG, s > 1 ? "Goed rendement per eenheid risico." : s < 0 ? "Negatief risico-gecorrigeerd rendement." : "Matig risico-gecorrigeerd rendement."));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Aggregatie
// ---------------------------------------------------------------------------

export function pillarScore(pillar: Pillar, factors: ScoreFactor[], horizon?: Horizon): number {
  const relevant = horizon ? factors.filter((f) => f.horizons.includes(horizon)) : factors;
  const max = relevant.reduce((s, f) => s + f.maxPoints, 0);
  if (max === 0) return 0;
  return Math.round((relevant.reduce((s, f) => s + f.points, 0) / max) * 100);
}

export function buildPillar(pillar: Pillar, factors: ScoreFactor[]): PillarScore {
  return { pillar, score: pillarScore(pillar, factors), factors };
}

export function adviceFor(score: number): Advice {
  if (score >= 45) return "STRONG_BUY";
  if (score >= 15) return "BUY";
  if (score > -15) return "HOLD";
  if (score > -45) return "SELL";
  return "STRONG_SELL";
}

export function verdict(
  pillars: Record<Pillar, PillarScore>,
  horizon: Horizon,
  dataQuality = 1,
): HorizonVerdict {
  const weights = HORIZON_WEIGHTS[horizon];
  const scores = {} as Record<Pillar, number>;
  let total = 0;
  let wsum = 0;
  for (const p of Object.keys(weights) as Pillar[]) {
    const hasFactors = pillars[p].factors.some((f) => f.horizons.includes(horizon));
    scores[p] = pillarScore(p, pillars[p].factors, horizon);
    if (!hasFactors) continue;
    total += scores[p] * weights[p];
    wsum += weights[p];
  }
  const score = Math.max(-100, Math.min(100, Math.round(wsum ? total / wsum : 0)));

  // Betrouwbaarheid: eensgezindheid van pijlers, sterkte van het signaal en datakwaliteit
  const sign = Math.sign(score);
  const pillarsList = (Object.keys(weights) as Pillar[]).filter((p) => scores[p] !== 0);
  const agreeing = pillarsList.filter((p) => Math.sign(scores[p]) === sign).reduce((s, p) => s + weights[p], 0);
  const agreeWeight = pillarsList.reduce((s, p) => s + weights[p], 0) || 1;
  const raw = 30 + (agreeing / agreeWeight) * 40 + Math.min(Math.abs(score), 60) / 2;
  const confidence = Math.round(Math.max(5, Math.min(95, raw * (0.6 + 0.4 * dataQuality))));

  return { horizon, score, advice: adviceFor(score), confidence, weights, pillarScores: scores };
}

function compact(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (a >= 1e12) return `${s}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
  return `${s}${a.toFixed(0)}`;
}
