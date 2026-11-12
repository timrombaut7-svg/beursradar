/**
 * Het geheugen van de trading bot. Bij elke aankoop legt hij vast wat er op dat moment speelde
 * (de "kenmerken"); bij elke verkoop ziet hij wat het opleverde. Daaruit leert hij per kenmerk
 * hoeveel winst of verlies het gemiddeld bracht, en die ervaring weegt mee bij de volgende keuzes.
 *
 * Om niet van toevalstreffers te leren wordt elk gemiddelde naar 0 getrokken zolang er weinig
 * trades zijn (n / (n + PRIOR)): één goede trade verandert weinig, twintig wel.
 */

export interface TradeFeatures {
  /** Technische korte-termijnscore (−100..100) */
  score: number;
  /** Haalde het signaal de historische toets? */
  proven: boolean;
  /** Koersverandering vandaag, in % */
  dayChangePct: number;
  type: "stock" | "crypto";
  /** RSI (14) */
  rsi: number | null;
  /** Fear & Greed (0..100) van de markt waar de asset bij hoort */
  fearGreed: number | null;
  /** Nieuwssentiment −1..1 */
  news: number | null;
  /** Beweeglijkheid (geannualiseerd, 0.3 = 30%) */
  volatility: number | null;
  /** Hoe de hele markt het vandaag doet (S&P 500 voor aandelen, Bitcoin voor crypto), in % */
  marketChangePct: number | null;
  /** Uur van de dag (UTC) */
  hourUtc: number;
}

/** Wat elk kenmerk in gewone taal betekent (voor de pagina "Wat de bot geleerd heeft"). */
export const BUCKET_LABEL: Record<string, string> = {
  "score:<40": "Zwak koopsignaal (score < 40)",
  "score:40-60": "Gemiddeld koopsignaal (score 40–60)",
  "score:60+": "Sterk koopsignaal (score 60+)",
  "proven:ja": "Signaal haalde de historische toets",
  "proven:nee": "Signaal zonder historisch bewijs",
  "dag:0-1%": "Stijgt vandaag een beetje (0–1%)",
  "dag:1-3%": "Stijgt vandaag flink (1–3%)",
  "dag:3%+": "Stijgt vandaag hard (3%+)",
  "type:stock": "Aandelen",
  "type:crypto": "Crypto",
  "rsi:<50": "RSI laag (< 50)",
  "rsi:50-70": "RSI normaal (50–70)",
  "rsi:70+": "RSI hoog: misschien overbought (70+)",
  "stemming:angst": "Markt is bang (Fear & Greed < 45)",
  "stemming:neutraal": "Stemming neutraal",
  "stemming:hebzucht": "Markt is hebberig (Fear & Greed > 55)",
  "nieuws:positief": "Positief nieuws",
  "nieuws:neutraal": "Neutraal nieuws",
  "nieuws:negatief": "Negatief nieuws",
  "volatiliteit:laag": "Rustige koers (beweeglijkheid < 30%)",
  "volatiliteit:hoog": "Wilde koers (beweeglijkheid 30%+)",
  "markt:omhoog": "Hele markt stijgt vandaag",
  "markt:omlaag": "Hele markt daalt vandaag",
  "tijd:ochtend": "Voor 14:00 UTC (Europa open, Amerika nog dicht)",
  "tijd:middag": "14:00–17:00 UTC (Amerika net open)",
  "tijd:avond": "Na 17:00 UTC",
};

/** Zet kenmerken om in vakjes ("buckets") waarvan de bot per vakje bijhoudt hoe het uitpakte. */
export function featureBuckets(f: TradeFeatures): string[] {
  const b: string[] = [];
  b.push(f.score < 40 ? "score:<40" : f.score < 60 ? "score:40-60" : "score:60+");
  b.push(f.proven ? "proven:ja" : "proven:nee");
  b.push(f.dayChangePct < 1 ? "dag:0-1%" : f.dayChangePct < 3 ? "dag:1-3%" : "dag:3%+");
  b.push(`type:${f.type}`);
  if (f.rsi !== null) b.push(f.rsi < 50 ? "rsi:<50" : f.rsi < 70 ? "rsi:50-70" : "rsi:70+");
  if (f.fearGreed !== null) b.push(f.fearGreed < 45 ? "stemming:angst" : f.fearGreed <= 55 ? "stemming:neutraal" : "stemming:hebzucht");
  if (f.news !== null) b.push(f.news > 0.15 ? "nieuws:positief" : f.news < -0.15 ? "nieuws:negatief" : "nieuws:neutraal");
  if (f.volatility !== null) b.push(f.volatility < 0.3 ? "volatiliteit:laag" : "volatiliteit:hoog");
  if (f.marketChangePct !== null) b.push(f.marketChangePct >= 0 ? "markt:omhoog" : "markt:omlaag");
  b.push(f.hourUtc < 14 ? "tijd:ochtend" : f.hourUtc < 17 ? "tijd:middag" : "tijd:avond");
  return b;
}

/** Hoeveel trades een vakje nodig heeft voordat de ervaring echt meetelt */
const PRIOR = 8;

export interface LearnedBucket {
  bucket: string;
  label: string;
  /** Aantal afgesloten trades met dit kenmerk */
  n: number;
  /** Gemiddeld resultaat per trade, in fractie (0.004 = +0,4%) */
  avgPct: number;
  /** Aandeel winnende trades */
  winRate: number;
  /** Wat de bot ervan meeneemt: het gemiddelde, naar 0 getrokken bij weinig trades */
  edgePct: number;
}

export interface LearnedModel {
  samples: number;
  buckets: LearnedBucket[];
}

/** Leert uit afgesloten trades: per vakje het (voorzichtige) gemiddelde resultaat. */
export function learn(samples: { features: TradeFeatures; pnlPct: number }[]): LearnedModel {
  const acc = new Map<string, { n: number; sum: number; wins: number }>();
  for (const s of samples) {
    for (const b of featureBuckets(s.features)) {
      const a = acc.get(b) ?? { n: 0, sum: 0, wins: 0 };
      a.n++;
      a.sum += s.pnlPct;
      if (s.pnlPct > 0) a.wins++;
      acc.set(b, a);
    }
  }
  const buckets = [...acc].map(([bucket, a]) => {
    const avgPct = a.sum / a.n;
    return { bucket, label: BUCKET_LABEL[bucket] ?? bucket, n: a.n, avgPct, winRate: a.wins / a.n, edgePct: avgPct * (a.n / (a.n + PRIOR)) };
  });
  return { samples: samples.length, buckets: buckets.sort((x, y) => y.edgePct - x.edgePct) };
}

/** Verwacht resultaat van een nieuwe trade met deze kenmerken, volgens wat de bot geleerd heeft (fractie). */
export function expectedEdge(model: LearnedModel, f: TradeFeatures): number {
  if (!model.samples) return 0;
  const map = new Map(model.buckets.map((b) => [b.bucket, b.edgePct]));
  // Gemiddelde over de kenmerken, zodat meer kenmerken het effect niet opblazen
  const edges = featureBuckets(f).map((b) => map.get(b) ?? 0);
  return edges.reduce((s, e) => s + e, 0) / edges.length;
}

/** Zoveel punten score per procent verwacht resultaat */
export const EDGE_WEIGHT = 40;
/** Pas na zoveel afgesloten trades mag de bot kansen overslaan die volgens zijn ervaring verlies geven */
export const MIN_SAMPLES_TO_SKIP = 20;
/** Verwacht verlies (fractie) waaronder hij een kans overslaat */
export const SKIP_BELOW = -0.002;

/** Past de score van een kans aan met de ervaring; null = overslaan. */
export function adjustScore(model: LearnedModel, f: TradeFeatures, baseScore: number): { score: number; edge: number } | null {
  const edge = expectedEdge(model, f);
  if (model.samples >= MIN_SAMPLES_TO_SKIP && edge < SKIP_BELOW) return null;
  return { score: baseScore + edge * 100 * EDGE_WEIGHT, edge };
}
