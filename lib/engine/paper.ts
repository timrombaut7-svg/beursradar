import type { AssetType } from "@/types";

/**
 * Oefenportfolio's met nepgeld: het €100.000-spel en de trading bot.
 * Alles in euro. Elke aan- of verkoop kost 0,1% (zoals bij een goedkope broker).
 * Zuivere functies, los testbaar; opslaan en koersen ophalen gebeurt in lib/server.
 */

export const START_CASH = 100_000;
export const FEE = 0.001;

export interface PaperTrade {
  symbol: string;
  type: AssetType | string;
  name: string;
  side: "buy" | "sell" | string;
  quantity: number;
  priceEur: number;
  feeEur: number;
}

export interface PaperHolding {
  symbol: string;
  type: AssetType;
  name: string;
  quantity: number;
  /** Gemiddelde aankoopprijs per stuk in euro (inclusief kosten) */
  avgPriceEur: number;
}

const key = (t: { symbol: string; type: string }) => `${t.type}:${t.symbol}`;
/** Afronding: na het verkopen van "alles" blijft door afrondingsfouten soms een piepklein restje over */
const DUST = 1e-9;

/** Cash en posities volgen uit alle trades (gemiddelde-kostprijsmethode). */
export function replayTrades(trades: PaperTrade[], startCash = START_CASH): { cashEur: number; holdings: PaperHolding[]; realizedEur: number } {
  let cash = startCash;
  let realized = 0;
  const map = new Map<string, PaperHolding>();
  for (const t of trades) {
    const k = key(t);
    const h = map.get(k) ?? { symbol: t.symbol, type: t.type as AssetType, name: t.name, quantity: 0, avgPriceEur: 0 };
    if (t.side === "buy") {
      const cost = t.quantity * t.priceEur + t.feeEur;
      h.avgPriceEur = (h.quantity * h.avgPriceEur + cost) / (h.quantity + t.quantity);
      h.quantity += t.quantity;
      cash -= cost;
    } else {
      const proceeds = t.quantity * t.priceEur - t.feeEur;
      realized += proceeds - t.quantity * h.avgPriceEur;
      h.quantity -= t.quantity;
      cash += proceeds;
    }
    if (h.quantity > DUST) map.set(k, h);
    else map.delete(k);
  }
  return { cashEur: cash, holdings: [...map.values()], realizedEur: realized };
}

export type TradeCheck = { ok: true; quantity: number; feeEur: number; totalEur: number } | { ok: false; error: string };

/**
 * Controleert een order in het spel. Kopen kan voor een bedrag in euro of een aantal stuks;
 * je kunt niet meer uitgeven dan je cash, en niet meer verkopen dan je hebt.
 */
export function checkOrder(
  order: { side: "buy" | "sell"; quantity?: number; amountEur?: number },
  priceEur: number,
  cashEur: number,
  heldQuantity: number,
): TradeCheck {
  if (!(priceEur > 0)) return { ok: false, error: "Geen koers beschikbaar" };
  // Kopen voor € X: inclusief kosten. Verkopen voor € X: X aan stukken.
  let quantity = order.quantity ?? (order.amountEur ? order.amountEur / (priceEur * (order.side === "buy" ? 1 + FEE : 1)) : 0);
  if (order.side === "sell" && order.quantity === undefined && order.amountEur === undefined) quantity = heldQuantity;
  if (!(quantity > 0)) return { ok: false, error: "Vul een bedrag of aantal in" };
  const gross = quantity * priceEur;
  const feeEur = gross * FEE;
  if (order.side === "buy") {
    if (gross + feeEur > cashEur + 0.005) return { ok: false, error: `Niet genoeg geld: je hebt nog € ${cashEur.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
    return { ok: true, quantity, feeEur, totalEur: gross + feeEur };
  }
  if (quantity > heldQuantity * (1 + 1e-9)) return { ok: false, error: "Je hebt niet zoveel stuks" };
  return { ok: true, quantity: Math.min(quantity, heldQuantity), feeEur, totalEur: gross - feeEur };
}

// ---------------------------------------------------------------------------
// Trading bot
// ---------------------------------------------------------------------------

/**
 * Spelregels van de bot, een daytrader: kleine, snelle winstjes en nooit langer dan een dag vasthouden.
 * Winstdoelen en stop-loss zijn vaste percentages vanaf de instapprijs (na 0,2% kosten heen en terug).
 */
export const BOT_RULES = {
  maxPositions: 5,
  positionPct: 0.2,
  minOrderEur: 500,
  /** Daytrader: na 24 uur gaat alles eruit (aandelen bij de eerstvolgende opening) */
  maxHoldHours: 24,
  stopPct: 0.01,
  target1Pct: 0.008,
  target2Pct: 0.015,
  /** Na een verkoop niet meteen hetzelfde aandeel terugkopen */
  cooldownMinutes: 120,
  /** Alleen kopen als het vandaag al stijgt, maar niet als het al te ver doorgeschoten is (in %) */
  minDayChangePct: 0.2,
  maxDayChangePct: 5,
} as const;

/** Stop-loss en koersdoelen van een daytrade, vanaf de instapprijs. */
export function dayTradeLevels(priceEur: number) {
  return {
    stopLossEur: priceEur * (1 - BOT_RULES.stopPct),
    target1Eur: priceEur * (1 + BOT_RULES.target1Pct),
    target2Eur: priceEur * (1 + BOT_RULES.target2Pct),
  };
}

/** Stop net boven de instapprijs, zodat ook de kosten gedekt zijn */
export const breakEven = (entryPriceEur: number) => entryPriceEur * (1 + 2 * FEE);

export interface BotPositionState {
  symbol: string;
  type: AssetType;
  name: string;
  quantity: number;
  entryPriceEur: number;
  stopLossEur: number;
  target1Eur: number;
  target2Eur: number;
  partialTaken: boolean;
  openedAt: Date;
}

export interface BotQuote {
  priceEur: number;
  /** Kan er nu gehandeld worden? (crypto altijd, aandelen alleen als de beurs open is) */
  tradable: boolean;
  /** Geeft het korte-termijnsignaal nu "verkopen"? */
  sellSignal: boolean;
}

export interface BotCandidate {
  symbol: string;
  type: AssetType;
  name: string;
  priceEur: number;
  stopLossEur: number;
  target1Eur: number;
  target2Eur: number;
  /** Hoe sterker het koopsignaal, hoe eerder de bot koopt */
  score: number;
  tradable: boolean;
}

export type BotAction =
  | { kind: "sell"; symbol: string; type: AssetType; quantity: number; priceEur: number; reason: string; closes: boolean; moveStopTo?: number }
  | { kind: "buy"; candidate: BotCandidate; quantity: number; reason: string };

/**
 * Eén ronde van de bot. Eerst uitstappen (verlies beperken, winst pakken), dan het vrijgekomen
 * geld in de sterkste kansen van dit moment steken. Als daytrader pakt hij kleine winstjes:
 * bij +0,8% de helft verkopen en de stop net boven de instapprijs (die trade kan dan niet meer
 * verliezen), bij +1,5% alles; bij −1% eruit, en niets langer dan een dag vasthouden.
 * `recentSells`: wanneer de bot een asset het laatst verkocht (om niet meteen terug te kopen).
 */
export function botDecide(
  positions: BotPositionState[],
  cashEur: number,
  quotes: Record<string, BotQuote>,
  candidates: BotCandidate[],
  now = new Date(),
  recentSells: Record<string, Date> = {},
): BotAction[] {
  const actions: BotAction[] = [];
  let cash = cashEur;
  let open = positions.length;

  for (const p of positions) {
    const q = quotes[key(p)];
    if (!q?.tradable || !(q.priceEur > 0)) continue;
    const price = q.priceEur;
    const sellAll = (reason: string) => {
      actions.push({ kind: "sell", symbol: p.symbol, type: p.type, quantity: p.quantity, priceEur: price, reason, closes: true });
      cash += p.quantity * price * (1 - FEE);
      open--;
    };
    const hours = (now.getTime() - p.openedAt.getTime()) / 3_600_000;
    if (price <= p.stopLossEur) sellAll(p.partialTaken ? "Stop op instapprijs geraakt: rest verkocht zonder verlies" : "Stop-loss geraakt: verlies beperkt");
    else if (price >= p.target2Eur) sellAll("Koersdoel 2 bereikt: alle winst genomen");
    else if (q.sellSignal) sellAll("Signaal sloeg om naar verkopen");
    else if (hours > BOT_RULES.maxHoldHours) sellAll("Daytrader: niet langer dan een dag vasthouden, positie gesloten");
    else if (!p.partialTaken && price >= p.target1Eur) {
      const half = p.quantity / 2;
      actions.push({
        kind: "sell",
        symbol: p.symbol,
        type: p.type,
        quantity: half,
        priceEur: price,
        reason: "Koersdoel 1 bereikt: helft verkocht, stop naar instapprijs",
        closes: false,
        moveStopTo: breakEven(p.entryPriceEur),
      });
      cash += half * price * (1 - FEE);
    }
  }

  // Waarde van alles (na de verkopen) bepaalt hoe groot een nieuwe positie mag zijn
  const held = new Set(positions.map(key));
  const sold = new Set(actions.filter((a) => a.kind === "sell" && a.closes).map((a) => (a.kind === "sell" ? `${a.type}:${a.symbol}` : "")));
  const invested = positions
    .filter((p) => !sold.has(key(p)))
    .reduce((s, p) => {
      const partial = actions.find((a) => a.kind === "sell" && !a.closes && a.symbol === p.symbol && a.type === p.type);
      return s + (partial && partial.kind === "sell" ? p.quantity - partial.quantity : p.quantity) * (quotes[key(p)]?.priceEur ?? p.entryPriceEur);
    }, 0);
  const equity = cash + invested;

  const fresh = candidates
    .filter((c) => {
      const lastSell = recentSells[key(c)];
      const cooling = lastSell && now.getTime() - lastSell.getTime() < BOT_RULES.cooldownMinutes * 60_000;
      return c.tradable && !held.has(key(c)) && !sold.has(key(c)) && !cooling && c.stopLossEur < c.priceEur && c.target1Eur > c.priceEur;
    })
    .sort((a, b) => b.score - a.score);
  for (const c of fresh) {
    if (open >= BOT_RULES.maxPositions) break;
    const size = Math.min(cash, equity * BOT_RULES.positionPct);
    if (size < BOT_RULES.minOrderEur) break;
    const quantity = size / (c.priceEur * (1 + FEE));
    actions.push({ kind: "buy", candidate: c, quantity, reason: `Koopsignaal en stijgt vandaag (score ${c.score > 0 ? "+" : ""}${Math.round(c.score)})` });
    cash -= size;
    open++;
  }
  return actions;
}
