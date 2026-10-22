import type { AssetType } from "@/types";
import { findAsset } from "@/lib/chat/local";
import { UNIVERSE } from "@/lib/api/universe";

/**
 * Leest de tekst van een screenshot van een portfolio uit een andere app (DEGIRO, Trade Republic,
 * Bitvavo, …) en haalt eruit welke beleggingen erin staan en hoeveel. Zuivere functies, los testbaar;
 * de tekstherkenning (OCR) zelf gebeurt in de browser.
 *
 * Per belegging zoeken we de regel met de naam of ticker, plus de regels eronder tot de volgende
 * belegging. Daarin herkennen we:
 *  - het aantal: een getal met "stuks", "aandelen", "st." of de ticker erachter ("0,05 BTC"),
 *    anders het eerste kale getal zonder valutateken;
 *  - de waarde: het grootste bedrag met valutateken zonder + of − ervoor;
 *  - winst/verlies: een bedrag met + of − ervoor (daarmee rekenen we de aankoopprijs terug).
 */

export interface ParsedHolding {
  symbol: string;
  type: AssetType;
  name: string;
  /** Aantal stuks, als dat letterlijk op de screenshot stond */
  quantity: number | null;
  /** Totale waarde zoals op de screenshot */
  value: { amount: number; currency: string } | null;
  /** Winst of verlies zoals op de screenshot */
  pnl: { amount: number; currency: string } | null;
  /** De regels waaruit dit gehaald is (om te tonen) */
  source: string;
}

interface Money {
  amount: number;
  currency: string;
  sign: "+" | "-" | null;
}

const CURRENCY: Record<string, string> = { "€": "EUR", eur: "EUR", $: "USD", usd: "USD", "£": "GBP", gbp: "GBP" };
const QTY_WORDS = /^(stuks?|st\.?|stk\.?|aandelen|aandeel|shares?|units?|x|pcs)$/i;

/**
 * Leest een getal zoals het in een app staat: "1.234,56", "1,234.56", "0,0123", "12.5", "1 234,5".
 * Eén scheidingsteken met precies drie cijfers erna en meerdere groepen telt als duizendtal.
 */
export function parseNumber(raw: string): number | null {
  let s = raw.replace(/[\s  ']/g, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? "." : ",";
    const thou = dec === "." ? "," : ".";
    s = s.split(thou).join("").replace(dec, ".");
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : ".";
    const parts = s.split(sep);
    // "1.234.567" of "1,234,567": duizendtallen. Eén keer "1.234" blijft een decimaal getal.
    s = parts.length > 2 && parts.slice(1).every((p) => p.length === 3) ? parts.join("") : parts.length === 2 ? `${parts[0]}.${parts[1]}` : s;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Alle getallen in een stuk tekst, met valuta, teken en het woord erachter. */
export interface FoundNumber {
  value: number;
  currency: string | null;
  sign: "+" | "-" | null;
  percent: boolean;
  /** Het woord direct erachter ("stuks", "BTC") */
  next: string;
}

export function extractNumbers(text: string): FoundNumber[] {
  const out: FoundNumber[] = [];
  // Spaties scheiden kolommen, dus alleen harde spaties tellen als duizendtal-scheiding
  const re = /([+\-−–])?\s?(€|\$|£|eur|usd|gbp)?\s?(\d[\d.,  ]*\d|\d)(?:\s?(€|\$|£|eur|usd|gbp|%))?(?:\s+([A-Za-z.]+))?/gi;
  for (const m of text.matchAll(re)) {
    const value = parseNumber(m[3].trim());
    if (value === null) continue;
    const pre = m[2]?.toLowerCase();
    const post = m[4]?.toLowerCase();
    out.push({
      value,
      currency: (pre && CURRENCY[pre]) || (post && post !== "%" && CURRENCY[post]) || null,
      sign: m[1] ? (m[1] === "+" ? "+" : "-") : null,
      percent: post === "%",
      next: m[5] ?? "",
    });
  }
  return out;
}

const shortName = (name: string) =>
  name
    .toLowerCase()
    .replace(/,?\s+(inc|corp|corporation|n\.?v|plc|ltd|holding|holdings|co|se|ag|sa)\.?$/i, "")
    .replace(/,/g, "")
    .trim();

/** Volledige namen uit de catalogus ("palantir technologies", "vanguard ftse all-world"). */
const NAMES = UNIVERSE.map((u) => ({ symbol: u.symbol, type: u.type, name: shortName(u.name) })).filter((n) => n.name.length >= 4);

/** Welke belegging staat er op deze regel? */
export function matchAsset(line: string): { symbol: string; type: AssetType } | null {
  const direct = findAsset(line);
  if (direct) return direct;
  const lower = ` ${line.toLowerCase().replace(/,/g, "")} `;
  const hit =
    NAMES.find((n) => lower.includes(` ${n.name} `)) ??
    // Alleen het eerste woord ("Palantir"), mits lang genoeg om niet per ongeluk te matchen
    NAMES.find((n) => {
      const first = n.name.split(" ")[0];
      return first.length >= 5 && lower.includes(` ${first} `);
    });
  return hit ? { symbol: hit.symbol, type: hit.type } : null;
}

export function parsePortfolioText(text: string): ParsedHolding[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Blokken: een regel met een belegging, plus de regels eronder tot de volgende (max. 3)
  const blocks: { asset: { symbol: string; type: AssetType }; lines: string[] }[] = [];
  for (const line of lines) {
    const asset = matchAsset(line);
    const last = blocks[blocks.length - 1];
    // Dezelfde belegging nog eens ("0,0312 BTC" onder "Bitcoin") hoort bij hetzelfde blok
    const same = asset && last && last.asset.symbol === asset.symbol && last.asset.type === asset.type;
    if (asset && !same) blocks.push({ asset, lines: [line] });
    else if (last && last.lines.length < 4) last.lines.push(line);
  }

  const out = new Map<string, ParsedHolding>();
  for (const { asset, lines: block } of blocks) {
    const key = `${asset.type}:${asset.symbol}`;
    if (out.has(key)) continue; // dezelfde belegging twee keer (bijv. kop en regel): de eerste telt
    const entry = UNIVERSE.find((u) => u.symbol === asset.symbol && u.type === asset.type);
    const ticker = asset.symbol.replace(/\.(AS|DE)$/, "").toLowerCase();
    // Getallen die bij de naam horen ("S&P 500", "FTSE 100", "Euro Stoxx 50") niet meetellen
    const text = block.join("  ").replace(/\b(s&p|ftse|stoxx|nasdaq|russell|msci|aex)\s?\d+/gi, "$1");
    const nums = extractNumbers(text).filter((n) => !n.percent);

    let quantity: number | null = null;
    const marked = nums.find((n) => !n.currency && !n.sign && (QTY_WORDS.test(n.next) || n.next.toLowerCase() === ticker));
    if (marked) quantity = marked.value;
    else {
      const bare = nums.find((n) => !n.currency && !n.sign && n.value > 0);
      if (bare) quantity = bare.value;
    }

    const money: Money[] = nums.filter((n) => n.currency).map((n) => ({ amount: n.value, currency: n.currency!, sign: n.sign }));
    const unsigned = money.filter((m) => !m.sign);
    const value = unsigned.length ? unsigned.reduce((a, b) => (b.amount > a.amount ? b : a)) : null;
    const signedMoney = money.find((m) => m.sign);
    const pnl: ParsedHolding["pnl"] = signedMoney
      ? { amount: signedMoney.sign === "-" ? -signedMoney.amount : signedMoney.amount, currency: signedMoney.currency }
      : null;
    if (quantity === null && !value) continue; // geen bruikbare cijfers

    out.set(key, {
      symbol: asset.symbol,
      type: asset.type,
      name: entry?.name ?? asset.symbol,
      quantity,
      value: value ? { amount: value.amount, currency: value.currency } : null,
      pnl,
      source: block.join(" · "),
    });
  }
  return [...out.values()];
}

export interface ImportProposal {
  symbol: string;
  type: AssetType;
  name: string;
  quantity: number;
  /** Aankoopprijs per stuk in de valuta van de belegging */
  buyPrice: number;
  currency: string;
  /** Huidige koers in de valuta van de belegging (0 als onbekend) */
  price: number;
  /** Hoe het aantal bepaald is */
  quantityFrom: "screenshot" | "value";
  /** Kwam de aankoopprijs van de screenshot (via winst/verlies) of is het de huidige koers? */
  buyPriceFrom: "screenshot" | "current";
  source: string;
}

/**
 * Maakt van de herkende regels voorstellen voor posities: aantal (zo nodig uit waarde ÷ koers)
 * en aankoopprijs (uit waarde − winst/verlies, anders de huidige koers).
 * `toEur` = hoeveel euro één eenheid van een valuta is.
 */
export function toProposals(
  holdings: ParsedHolding[],
  prices: Record<string, { price: number; currency: string }>,
  toEur: Record<string, number>,
): ImportProposal[] {
  const convert = (amount: number, from: string, to: string) => {
    if (from === to) return amount;
    const a = toEur[from];
    const b = toEur[to];
    return a && b ? (amount * a) / b : null;
  };
  return holdings.flatMap((h) => {
    const live = prices[`${h.type}:${h.symbol}`];
    const currency = live?.currency ?? "USD";
    const price = live?.price ?? 0;
    let quantity = h.quantity;
    let quantityFrom: ImportProposal["quantityFrom"] = "screenshot";
    const valueInAsset = h.value ? convert(h.value.amount, h.value.currency, currency) : null;
    if (quantity === null && valueInAsset && price > 0) {
      quantity = valueInAsset / price;
      quantityFrom = "value";
    }
    if (!quantity || !(quantity > 0)) return [];

    let buyPrice = price;
    let buyPriceFrom: ImportProposal["buyPriceFrom"] = "current";
    if (valueInAsset && h.pnl && h.value) {
      const pnlInAsset = convert(h.pnl.amount, h.pnl.currency, currency);
      const cost = pnlInAsset !== null ? valueInAsset - pnlInAsset : null;
      if (cost && cost > 0) {
        buyPrice = cost / quantity;
        buyPriceFrom = "screenshot";
      }
    }
    if (!(buyPrice > 0)) return [];
    return [{ symbol: h.symbol, type: h.type, name: h.name, quantity, buyPrice, currency, price, quantityFrom, buyPriceFrom, source: h.source }];
  });
}
