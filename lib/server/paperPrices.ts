import type { AssetType } from "@/types";
import { getLivePrices, getRatesToEur } from "@/lib/api/livePrices";

export interface EurQuote {
  priceEur: number;
  /** Prijs en valuta zoals de beurs ze geeft */
  price: number;
  currency: string;
  marketState: string;
  /** Koersverandering vandaag in procenten (1.5 = +1,5%) */
  changePct: number;
}

/** Live koersen omgerekend naar euro. Zonder live koers of wisselkoers ontbreekt een asset. */
export async function eurQuotes(assets: { symbol: string; type: AssetType }[]): Promise<Record<string, EurQuote>> {
  if (!assets.length) return {};
  const [live, toEur] = await Promise.all([getLivePrices(assets), getRatesToEur()]);
  const out: Record<string, EurQuote> = {};
  for (const p of live) {
    const rate = toEur[p.currency];
    if (!rate || !(p.price > 0)) continue;
    out[`${p.type}:${p.symbol}`] = { priceEur: p.price * rate, price: p.price, currency: p.currency, marketState: p.marketState, changePct: p.changePct };
  }
  return out;
}
