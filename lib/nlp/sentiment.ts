import type { SentimentLabel } from "@/types";

/**
 * Lichtgewicht financiële sentimentanalyse op basis van een keyword-lexicon
 * (geïnspireerd op Loughran-McDonald), met ondersteuning voor negaties
 * ("not", "no", "niet") en versterkers ("strong", "record").
 * Werkt voor Engelse en (beperkt) Nederlandse koppen.
 */

const POSITIVE: Record<string, number> = {
  beat: 2, beats: 2, surge: 2, surges: 2, soar: 2, soars: 2, rally: 2, rallies: 2, jump: 1.5, jumps: 1.5,
  gain: 1, gains: 1, rise: 1, rises: 1, climb: 1, climbs: 1, upgrade: 2, upgrades: 2, upgraded: 2,
  bullish: 2, outperform: 1.5, record: 1, growth: 1, profit: 1, profits: 1, strong: 1, partnership: 1,
  approval: 1.5, approved: 1.5, breakout: 1.5, buy: 1, inflows: 1.5, inflow: 1.5, adoption: 1.5, expands: 1,
  expanded: 1, launch: 0.5, launches: 0.5, wins: 1, win: 1, optimistic: 1.5, recovery: 1, rebound: 1.5,
  accelerates: 1, accelerating: 1, etf: 0.5, all_time_high: 2, ath: 1.5, higher: 0.5, positive: 1,
  stijgt: 1, stijging: 1, winst: 1, groei: 1, koopadvies: 2, opwaardering: 2,
};

const NEGATIVE: Record<string, number> = {
  miss: 2, misses: 2, missed: 2, plunge: 2, plunges: 2, crash: 2.5, crashes: 2.5, slump: 2, slumps: 2,
  drop: 1.5, drops: 1.5, fall: 1, falls: 1, slide: 1.5, slides: 1.5, decline: 1, declines: 1, sink: 1.5, sinks: 1.5,
  downgrade: 2, downgrades: 2, downgraded: 2, bearish: 2, underperform: 1.5, lawsuit: 1.5, sued: 1.5,
  investigation: 1.5, probe: 1.5, fraud: 2.5, hack: 2.5, hacked: 2.5, exploit: 2, loss: 1.5, losses: 1.5,
  weak: 1, warning: 1.5, warn: 1.5, warns: 1.5, risk: 0.5, risks: 0.5, sell: 1, selloff: 2, "sell-off": 2,
  outflows: 1.5, outflow: 1.5, ban: 2, bans: 2, layoffs: 1.5, cuts: 1, recession: 2, bankruptcy: 3,
  default: 2, delay: 1, delays: 1, fine: 1, fined: 1.5, slowing: 1, lower: 0.5, liquidation: 2, liquidations: 2,
  daalt: 1, daling: 1, verlies: 1.5, verkoopadvies: 2, onderzoek: 1, boete: 1.5,
};

const NEGATIONS = new Set(["not", "no", "never", "without", "niet", "geen", "nooit"]);
const INTENSIFIERS: Record<string, number> = { strong: 1.3, sharply: 1.5, massive: 1.5, huge: 1.4, record: 1.3, sterk: 1.3 };

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/all[- ]time[- ]high/g, "all_time_high")
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreText(text: string): { score: number; label: SentimentLabel; hits: string[] } {
  const tokens = tokenize(text);
  let raw = 0;
  const hits: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let w = POSITIVE[t] ?? 0;
    w -= NEGATIVE[t] ?? 0;
    if (w === 0) continue;
    const prev = tokens[i - 1];
    const prev2 = tokens[i - 2];
    if ((prev && NEGATIONS.has(prev)) || (prev2 && NEGATIONS.has(prev2))) w = -w * 0.8;
    if (prev && INTENSIFIERS[prev] && !POSITIVE[prev] && !NEGATIVE[prev]) w *= INTENSIFIERS[prev];
    raw += w;
    hits.push(t);
  }
  // Squash naar -1..1
  const score = Math.tanh(raw / 3);
  const label: SentimentLabel = score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral";
  return { score: Math.round(score * 100) / 100, label, hits };
}

/** Gemiddelde sentimentscore, recentere items wegen zwaarder (halfwaardetijd 48u). */
export function aggregateSentiment(items: { sentimentScore: number; publishedAt: number }[], now = Date.now()): number {
  if (!items.length) return 0;
  let sum = 0;
  let wsum = 0;
  for (const it of items) {
    const ageH = Math.max(0, (now - it.publishedAt) / 3600_000);
    const w = Math.pow(0.5, ageH / 48);
    sum += it.sentimentScore * w;
    wsum += w;
  }
  return wsum ? sum / wsum : 0;
}
