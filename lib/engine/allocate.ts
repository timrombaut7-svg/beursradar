import type { Horizon, Opportunity } from "@/types";

/**
 * Verdeelt een budget over ETF's, aandelen en crypto ("kern en satellieten"):
 *  - de kern zijn brede ETF's (spreiding), de satellieten losse aandelen en crypto;
 *  - het risicoprofiel bepaalt de verhouding tussen die drie;
 *  - binnen een groep gaat meer geld naar kansen met een hogere score, maar nooit meer
 *    dan een vast maximum per losse belegging, zodat één tegenvaller niet alles kost;
 *  - alleen kansen die de historische toets haalden komen in aanmerking;
 *  - wat geen goede bestemming heeft, blijft als reserve over (liever geen tip dan een slechte).
 */

export type RiskProfile = "careful" | "balanced" | "bold";
export type Bucket = "etf" | "stock" | "crypto";

export const RISK_PROFILES: Record<RiskProfile, { label: string; description: string; mix: Record<Bucket, number> }> = {
  careful: {
    label: "Voorzichtig",
    description: "Vooral brede ETF's, een klein deel losse aandelen, geen crypto.",
    mix: { etf: 0.8, stock: 0.2, crypto: 0 },
  },
  balanced: {
    label: "Gemiddeld",
    description: "Een stevige basis van ETF's, aangevuld met aandelen en een beetje crypto.",
    mix: { etf: 0.6, stock: 0.3, crypto: 0.1 },
  },
  bold: {
    label: "Avontuurlijk",
    description: "Meer losse aandelen en crypto: grotere kans op winst, maar ook op flinke dalingen.",
    mix: { etf: 0.4, stock: 0.4, crypto: 0.2 },
  },
};

/** Maximum aantal beleggingen per groep. */
const MAX_PICKS: Record<Bucket, number> = { etf: 2, stock: 5, crypto: 2 };
/** Maximum deel van het hele budget in één losse belegging (ETF's mogen groter: die zijn zelf al gespreid).
 *  Bij een klein budget mag het hoger, tot 2× het minimumbedrag, zodat elke aankoop zinvol blijft. */
const MAX_SINGLE: Record<Bucket, number> = { etf: 1, stock: 0.1, crypto: 0.1 };
/** Kleinste zinvolle bedrag per belegging (kosten per aankoop wegen anders te zwaar). */
export const MIN_PER_ITEM = 50;

export interface AllocationItem {
  bucket: Bucket;
  opportunity: Opportunity;
  /** Deel van het budget (0..1) */
  weight: number;
  /** Bedrag in euro */
  amount: number;
  /** Aantal stuks bij de huidige koers (null als de wisselkoers onbekend is) */
  units: number | null;
}

export interface AllocationPlan {
  amount: number;
  risk: RiskProfile;
  horizon: Horizon;
  items: AllocationItem[];
  /** Bedrag dat niet belegd wordt (geen goede kansen, of te klein budget) */
  reserve: number;
  buckets: Record<Bucket, { target: number; actual: number }>;
  notes: string[];
}

export const bucketOf = (o: Opportunity): Bucket => (o.row.type === "crypto" ? "crypto" : o.row.etf ? "etf" : "stock");

/**
 * @param opportunities kansen voor de gekozen termijn, gesorteerd op score (beste eerst)
 * @param toEur wisselkoers naar euro per valuta (bijv. { EUR: 1, USD: 0.92 }); onbekende valuta → geen stuks
 */
export function allocate(
  amount: number,
  risk: RiskProfile,
  horizon: Horizon,
  opportunities: Opportunity[],
  toEur: Record<string, number> = { EUR: 1 },
): AllocationPlan {
  const mix = RISK_PROFILES[risk].mix;
  const byBucket: Record<Bucket, Opportunity[]> = { etf: [], stock: [], crypto: [] };
  for (const o of opportunities) if (o.score > 0) byBucket[bucketOf(o)].push(o);

  // Klein budget → minder beleggingen, zodat elke aankoop gemiddeld minstens 2× het minimum is
  // en de aankoopkosten niet te zwaar wegen. Een groep die daarvoor te klein is, valt af.
  // Eerst aandelen en crypto; een lege of te kleine groep schuift door naar de ETF's (de basis)
  const target: Record<Bucket, number> = { etf: mix.etf, stock: mix.stock, crypto: mix.crypto };
  const share: Record<Bucket, number> = { ...target };
  const picks: Record<Bucket, Opportunity[]> = { etf: [], stock: [], crypto: [] };
  const pickCount = (b: Bucket) => Math.min(MAX_PICKS[b], Math.max(1, Math.floor((share[b] * amount) / (2 * MIN_PER_ITEM))));
  for (const b of ["stock", "crypto"] as Bucket[]) {
    if (share[b] * amount >= MIN_PER_ITEM) picks[b] = byBucket[b].slice(0, pickCount(b));
    if (!picks[b].length) {
      share.etf += share[b];
      share[b] = 0;
    }
  }
  if (share.etf > 0) picks.etf = byBucket.etf.slice(0, pickCount("etf"));

  // Plafond per losse belegging: normaal 10%, maar bij een klein budget minstens 2× het minimumbedrag
  const cap = (b: Bucket) => Math.min(1, Math.max(MAX_SINGLE[b], (2 * MIN_PER_ITEM) / amount));
  const weights = new Map<Opportunity, number>();
  let leftover = 0;
  for (const b of ["etf", "stock", "crypto"] as Bucket[]) {
    if (!picks[b].length) {
      leftover += share[b];
      continue;
    }
    // Verdeel naar score, met een plafond per belegging; wat boven het plafond uitkomt, gaat naar de rest
    let remaining = share[b];
    let open = [...picks[b]];
    while (open.length && remaining > 1e-9) {
      const total = open.reduce((s, o) => s + o.score, 0);
      const capped: Opportunity[] = [];
      let used = 0;
      for (const o of open) {
        const want = (remaining * o.score) / total;
        const room = cap(b) - (weights.get(o) ?? 0);
        const give = Math.min(want, room);
        weights.set(o, (weights.get(o) ?? 0) + give);
        used += give;
        if (give < want - 1e-9) capped.push(o);
      }
      remaining -= used;
      if (!capped.length) break;
      open = open.filter((o) => !capped.includes(o));
    }
    // Wat binnen aandelen/crypto niet geplaatst kan worden (plafonds), gaat naar de ETF's
    if (remaining > 1e-9) {
      if (b !== "etf" && picks.etf.length) {
        const per = remaining / picks.etf.length;
        for (const o of picks.etf) weights.set(o, (weights.get(o) ?? 0) + per);
      } else leftover += remaining;
    }
  }

  // Bedragen in hele euro's; afrondingsverschil naar de grootste post
  const items: AllocationItem[] = [...weights.entries()]
    .filter(([, w]) => w > 0)
    .map(([o, w]) => ({ bucket: bucketOf(o), opportunity: o, weight: w, amount: Math.floor(amount * w), units: null }));
  const reserve0 = Math.floor(amount * leftover);
  const diff = Math.round(amount - reserve0 - items.reduce((s, i) => s + i.amount, 0));
  if (items.length && diff !== 0) {
    const biggest = items.reduce((a, b) => (b.amount > a.amount ? b : a));
    biggest.amount += diff;
  }
  for (const i of items) {
    i.weight = i.amount / amount;
    const rate = toEur[i.opportunity.row.currency];
    i.units = rate && i.opportunity.row.price > 0 ? i.amount / rate / i.opportunity.row.price : null;
  }
  items.sort((a, b) => b.amount - a.amount);
  const reserve = Math.round(amount - items.reduce((s, i) => s + i.amount, 0));

  const actual = (b: Bucket) => items.filter((i) => i.bucket === b).reduce((s, i) => s + i.amount, 0) / amount;
  const buckets = {
    etf: { target: target.etf, actual: actual("etf") },
    stock: { target: target.stock, actual: actual("stock") },
    crypto: { target: target.crypto, actual: actual("crypto") },
  };

  const notes: string[] = [];
  if (reserve > 0) {
    notes.push(
      `€ ${reserve} blijft voorlopig als reserve over: er zijn nu niet genoeg kansen die de historische toets halen. Liever wachten dan iets slechts kopen.`,
    );
  }
  const tooSmall = (b: Bucket) => target[b] > 0 && target[b] * amount < MIN_PER_ITEM;
  for (const b of ["stock", "crypto"] as Bucket[]) {
    if (target[b] === 0 || picks[b].length) continue;
    const what = b === "stock" ? "losse aandelen" : "crypto";
    notes.push(
      tooSmall(b)
        ? `Voor ${what} is dit budget te klein (minder dan € ${MIN_PER_ITEM}); dat deel gaat naar ETF's.`
        : `${b === "stock" ? "Geen enkel aandeel" : "Geen enkele crypto"} haalt nu de toets; dat deel gaat naar ETF's.`,
    );
  }
  if (amount < MIN_PER_ITEM * 6) notes.push("Met een klein budget houden we het bij weinig beleggingen, zodat de aankoopkosten niet te zwaar wegen.");
  notes.push(
    horizon === "long"
      ? "Koop niet alles op één dag: spreid je aankopen bijvoorbeeld over 3 maanden. Zo maakt het precies goede moment minder uit."
      : "Korte termijn: zet bij elke aankoop meteen de stop-loss uit het plan, en verkoop als de app dat zegt.",
  );
  notes.push("Beleg alleen geld dat je een paar jaar kunt missen, en houd een spaarbuffer voor onverwachte kosten.");

  return { amount, risk, horizon, items, reserve, buckets, notes };
}
