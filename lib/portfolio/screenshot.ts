import type { AssetType } from "@/types";
import { findAsset } from "@/lib/chat/local";
import { UNIVERSE } from "@/lib/api/universe";

/**
 * Leest de tekst van een screenshot van een portfolio uit een andere app (DEGIRO, Trade Republic,
 * Bitvavo, …) en haalt eruit welke beleggingen erin staan en hoeveel. Zuivere functies, los testbaar;
 * de tekstherkenning (OCR) zelf gebeurt in de browser.
 *
 * Stap 1 (`parsePortfolioText`): per belegging de regel met de naam of ticker, plus de regels eronder
 * tot de volgende belegging, met alle getallen daarin.
 * Stap 2 (`toProposals`): met de live koers bepalen welk getal het aantal is. Apps zetten getallen in
 * allerlei volgordes en vaak zonder valutateken, dus we kiezen niet "het eerste getal", maar het getal
 * waarvoor aantal × koers past bij de waarde op de screenshot.
 */

export interface FoundNumber {
  value: number;
  currency: string | null;
  sign: "+" | "-" | null;
  percent: boolean;
  /** Het woord ervoor ("Aantal", "Koers") en erachter ("stuks", "BTC") */
  prev: string;
  next: string;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface ParsedHolding {
  symbol: string;
  type: AssetType;
  name: string;
  /** Aantal als dat er letterlijk bij stond ("12 stuks", "0,05 BTC", "Aantal: 3") */
  quantity: number | null;
  /** Totale waarde: het grootste bedrag met valutateken zonder + of − ervoor */
  value: Money | null;
  /** Winst of verlies: een bedrag met + of − ervoor */
  pnl: Money | null;
  /** Alle getallen in het blok (zonder procenten), in leesvolgorde */
  numbers: FoundNumber[];
  /** De regels waaruit dit gehaald is (om te tonen) */
  source: string;
}

const CURRENCY: Record<string, string> = { "€": "EUR", eur: "EUR", $: "USD", "us$": "USD", usd: "USD", "£": "GBP", gbp: "GBP" };
const QTY_AFTER = /^(stuks?|st\.?|stk\.?|aandelen|aandeel|shares?|units?|x|×|pcs|eenheden)$/i;
const QTY_BEFORE = /^(aantal|units|quantity|qty|hoeveelheid)$/i;
const BUY_LABEL = /^(gem\.?|gemiddeld|gemiddelde|aankoop|aankoopprijs|aankoopkoers|gak|avg\.?|average|kostprijs|instap|instapkoers|open|cost|gekocht)$/i;
/** Regels die geen deel van een belegging zijn (totalen onder de lijst) */
const STOP_LINE = /\b(totaal|total|saldo|beschikbaar|cash|vrije ruimte|rekening)\b/i;

/**
 * Leest een getal zoals het in een app staat: "1.234,56", "1,234.56", "0,0123", "12.5", "1 234,5".
 * Eén scheidingsteken met precies drie cijfers erna en meerdere groepen telt als duizendtal.
 */
export function parseNumber(raw: string): number | null {
  let s = raw.replace(/[\s\u00a0\u202f']/g, "");
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

/**
 * De tekstherkenning leest € en $ soms als letter: "E150,00", "C150,00", "S150.00".
 * Alleen vlak voor een bedrag met twee decimalen, zodat gewone woorden met cijfers blijven staan.
 */
export function fixMisreadCurrency(text: string): string {
  return text.replace(/(^|[\s(+\-−–—‒－])([ECS])(?=\d[\d.,]*[.,]\d{2}(?!\d))/g, (_, before: string, letter: string) => `${before}${letter === "S" ? "$" : "€"}`);
}

type Token = { kind: "currency" | "number" | "percent" | "sign" | "word"; text: string; spaceBefore: boolean };

// Spaties scheiden kolommen, dus alleen harde spaties tellen als duizendtal-scheiding
const TOKEN =
  /(us\$|€|\$|£|(?<![a-z])(?:eur|usd|gbp)(?![a-z]))|(\d[\d.,\u00a0\u202f]*\d|\d)|(%)|([+\-−–—‒－])|([A-Za-zÀ-ÿ.×]+)/gi;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let end = 0;
  for (const m of text.matchAll(TOKEN)) {
    const kind = m[1] ? "currency" : m[2] ? "number" : m[3] ? "percent" : m[4] ? "sign" : "word";
    tokens.push({ kind, text: m[0], spaceBefore: m.index > end });
    end = m.index + m[0].length;
  }
  return tokens;
}

/** Bedragen hebben twee decimalen ("150,00"); aantallen meestal niet ("2", "0,0312") */
const looksLikeMoney = (raw: string) => /[.,]\d{2}$/.test(raw);

/**
 * Alle getallen in een stuk tekst, met valuta, teken en de woorden ervoor en erachter.
 * Een valutateken tussen twee getallen ("2 € 300,00", "150,00 € 2 stuks") hoort bij het getal dat
 * eruitziet als een bedrag; twijfel je, dan bij het getal erna ("€ 300").
 */
export function extractNumbers(text: string): FoundNumber[] {
  const tokens = tokenize(text);
  const numberAfter = (i: number) =>
    tokens[i + 1]?.kind === "number" ? i + 1 : tokens[i + 1]?.kind === "sign" && tokens[i + 2]?.kind === "number" ? i + 2 : -1;
  // Staat er ergens een valutateken achter een bedrag zonder getal erna ("300,00 €")? Dan schrijft deze app de valuta achteraan
  const suffixStyle = tokens.some((t, i) => t.kind === "currency" && tokens[i - 1]?.kind === "number" && numberAfter(i) < 0);
  // Bij welk getal hoort elk valutateken?
  const owner = new Map<number, number>();
  tokens.forEach((t, i) => {
    if (t.kind !== "currency") return;
    const before = tokens[i - 1]?.kind === "number" ? i - 1 : -1;
    const after = numberAfter(i);
    if (before >= 0 && after >= 0) {
      const moneyBefore = looksLikeMoney(tokens[before].text);
      const moneyAfter = looksLikeMoney(tokens[after].text);
      owner.set(i, moneyBefore !== moneyAfter ? (moneyBefore ? before : after) : suffixStyle ? before : after);
    } else if (after >= 0) owner.set(i, after);
    else if (before >= 0) owner.set(i, before);
  });

  const out: FoundNumber[] = [];
  tokens.forEach((t, i) => {
    if (t.kind !== "number") return;
    const value = parseNumber(t.text);
    if (value === null) return;
    const cur = [...owner].find(([, n]) => n === i)?.[0];
    const currency = cur !== undefined ? CURRENCY[tokens[cur].text.toLowerCase()] : null;
    const percent = tokens[i + 1]?.kind === "percent";
    // Teken direct ervoor, of vóór het valutateken ("−€ 35,80", "+€12")
    const signAt = tokens[i - 1]?.kind === "sign" ? i - 1 : cur === i - 1 && tokens[i - 2]?.kind === "sign" ? i - 2 : -1;
    // Een los streepje ("Apple - 12 stuks") is een scheidingsteken, geen min: alleen bij bedragen,
    // procenten of vast aan het getal telt het als teken
    const attached = signAt >= 0 && !tokens[signAt + 1].spaceBefore;
    const signed = signAt >= 0 && (attached || Boolean(currency) || percent);
    const firstOwn = signAt >= 0 ? signAt : cur !== undefined && cur < i ? cur : i;
    const prevTok = tokens[firstOwn - 1];
    const nextIdx = cur !== undefined && cur > i ? cur + 1 : percent ? i + 2 : i + 1;
    const nextTok = tokens[nextIdx];
    out.push({
      value,
      currency: currency ?? null,
      sign: signed ? (tokens[signAt].text === "+" ? "+" : "-") : null,
      percent,
      prev: prevTok?.kind === "word" ? prevTok.text.replace(/:$/, "") : "",
      next: nextTok?.kind === "word" ? nextTok.text : "",
    });
  });
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
    .map((l) => fixMisreadCurrency(l.replace(/\s+/g, " ").trim()))
    .filter(Boolean);

  // Blokken: een regel met een belegging, plus de regels eronder tot de volgende (max. 3)
  const blocks: { asset: { symbol: string; type: AssetType }; lines: string[]; closed: boolean }[] = [];
  for (const line of lines) {
    const asset = matchAsset(line);
    const last = blocks[blocks.length - 1];
    // Dezelfde belegging nog eens ("0,0312 BTC" onder "Bitcoin") hoort bij hetzelfde blok
    const same = asset && last && last.asset.symbol === asset.symbol && last.asset.type === asset.type;
    if (asset && !same) blocks.push({ asset, lines: [line], closed: false });
    else if (!asset && STOP_LINE.test(line)) {
      if (last) last.closed = true;
    } else if (last && !last.closed && last.lines.length < 4) last.lines.push(line);
  }

  const out = new Map<string, ParsedHolding>();
  for (const { asset, lines: block } of blocks) {
    const key = `${asset.type}:${asset.symbol}`;
    if (out.has(key)) continue; // dezelfde belegging twee keer (bijv. kop en regel): de eerste telt
    const entry = UNIVERSE.find((u) => u.symbol === asset.symbol && u.type === asset.type);
    const ticker = asset.symbol.replace(/\.(AS|DE)$/, "").toLowerCase();
    // Getallen die bij de naam horen ("S&P 500", "FTSE 100", "Euro Stoxx 50") niet meetellen
    const text = block.join("  ").replace(/\b(s&p|ftse|stoxx|nasdaq|russell|msci|aex)\s?\d+/gi, "$1");
    const numbers = extractNumbers(text).filter((n) => !n.percent && n.value > 0);
    if (!numbers.length) continue;

    const marked = numbers.find(
      (n) => !n.currency && !n.sign && (QTY_AFTER.test(n.next) || n.next.toLowerCase() === ticker || QTY_BEFORE.test(n.prev)),
    );
    const unsignedMoney = numbers.filter((n) => n.currency && !n.sign);
    const value = unsignedMoney.length ? unsignedMoney.reduce((a, b) => (b.value > a.value ? b : a)) : null;
    const signedMoney = numbers.find((n) => n.currency && n.sign);

    out.set(key, {
      symbol: asset.symbol,
      type: asset.type,
      name: entry?.name ?? asset.symbol,
      quantity: marked?.value ?? null,
      value: value ? { amount: value.value, currency: value.currency! } : null,
      pnl: signedMoney ? { amount: signedMoney.sign === "-" ? -signedMoney.value : signedMoney.value, currency: signedMoney.currency! } : null,
      numbers,
      source: block.join(" · "),
    });
  }
  return [...out.values()];
}

export interface ImportProposal {
  symbol: string;
  type: AssetType;
  name: string;
  /** Aantal stuks; null als het niet te bepalen was (de gebruiker vult het dan zelf in) */
  quantity: number | null;
  /** Aankoopprijs per stuk in de valuta van de belegging */
  buyPrice: number;
  currency: string;
  /** Huidige koers in de valuta van de belegging (0 als onbekend) */
  price: number;
  /** Hoe het aantal bepaald is */
  quantityFrom: "screenshot" | "value" | "missing";
  /** Kwam de aankoopprijs van de screenshot (via winst/verlies of "gem. aankoopprijs") of is het de huidige koers? */
  buyPriceFrom: "screenshot" | "current";
  /** De waarde op de screenshot, omgerekend naar de valuta van de belegging (om het aantal te controleren) */
  screenshotValue: number | null;
  /** De aankoopprijs in de valuta van de screenshot, als die anders is ("≈ € 180,00") */
  buyPriceShown: Money | null;
  source: string;
}

/** Hoe ver aantal × koers van de waarde op de screenshot mag liggen (koersen bewegen, en apps lopen soms achter) */
const VALUE_TOLERANCE = Math.log(1.35);
/** Een getal binnen deze factor van de koers ziet eruit als een koers, niet als een aantal */
const PRICE_LIKE = Math.log(1.6);

type Convert = (amount: number, from: string, to: string) => number | null;

/**
 * Bepaalt welk getal het aantal is, in deze volgorde:
 *  1. er staat "stuks", "aandelen", "x", de ticker ("0,05 BTC") of "Aantal:" bij (en het past bij de waarde);
 *  2. drie getallen met aantal × koers = waarde ("2 × 150,00 = 300,00", ook zonder valutateken);
 *  3. het getal waarvoor aantal × live koers het best past bij de waarde op de screenshot;
 *  4. twee getallen waarvan het ene ongeveer het andere × de live koers is (aantal en waarde zonder €);
 *  5. alleen een waarde: aantal = waarde ÷ live koers;
 *  6. anders het eerste getal dat niet op een koers lijkt; lijkt alles op een koers, dan is het aantal onbekend.
 */
function resolveQuantity(
  h: ParsedHolding,
  price: number | null,
  currency: string,
  convert: Convert,
): { quantity: number | null; from: ImportProposal["quantityFrom"]; value: Money | null } {
  const bare = h.numbers.filter((n) => !n.currency && !n.sign);
  const unsigned = h.numbers.filter((n) => !n.sign);
  const V = h.value;

  if (!price) {
    const q = h.quantity ?? bare[0]?.value ?? null;
    return { quantity: q, from: q === null ? "missing" : "screenshot", value: V };
  }

  // De koers van nu in de valuta's die een app kan tonen
  const curs = [...new Set([currency, "EUR", "USD", ...(V ? [V.currency] : [])])];
  const priceIn = curs.flatMap((c) => {
    const p = convert(price, currency, c);
    return p ? [{ currency: c, price: p }] : [];
  });
  const priceDistance = (n: number) => Math.min(...priceIn.map((x) => Math.abs(Math.log(n / x.price))));
  const nearestCurrency = (n: number) => priceIn.reduce((a, b) => (Math.abs(Math.log(n / b.price)) < Math.abs(Math.log(n / a.price)) ? b : a)).currency;
  const priceInValue = V ? (convert(price, currency, V.currency) ?? price) : null;
  const fit = (q: number) => (V && priceInValue ? Math.abs(Math.log((q * priceInValue) / V.amount)) : Infinity);

  // 1. Expliciet aantal, tenzij het totaal niet past bij de waarde (dan is er waarschijnlijk iets verkeerd gelezen)
  if (h.quantity !== null && (!V || fit(h.quantity) < Math.log(3))) return { quantity: h.quantity, from: "screenshot", value: V };

  // 2. aantal × koers = waarde, met de koers het getal dat het dichtst bij de live koers ligt
  for (const q of bare) {
    for (const p of unsigned) {
      if (p === q || priceDistance(p.value) > Math.log(3)) continue;
      if (priceDistance(p.value) > priceDistance(q.value)) continue; // de koers is het getal dat het meest op een koers lijkt
      const m = unsigned.find((x) => x !== q && x !== p && Math.abs(q.value * p.value - x.value) / x.value < 0.015);
      if (m) {
        const cur = m.currency ?? p.currency ?? V?.currency ?? nearestCurrency(p.value);
        return { quantity: q.value, from: "screenshot", value: V ?? { amount: m.value, currency: cur } };
      }
    }
  }

  // 3. Past aantal × live koers bij de waarde op de screenshot?
  if (V && priceInValue) {
    const best = bare.filter((n) => fit(n.value) < VALUE_TOLERANCE).sort((a, b) => fit(a.value) - fit(b.value))[0];
    if (best) return { quantity: best.value, from: "screenshot", value: V };
  }

  // 4. Aantal en waarde allebei zonder valutateken
  for (const q of bare) {
    for (const v of bare) {
      if (v === q) continue;
      const hit = priceIn.find((x) => Math.abs(Math.log((q.value * x.price) / v.value)) < VALUE_TOLERANCE);
      if (hit && priceDistance(q.value) > PRICE_LIKE) return { quantity: q.value, from: "screenshot", value: V ?? { amount: v.value, currency: hit.currency } };
    }
  }

  // 5. Alleen de waarde is bekend. Aandelen koop je meestal per stuk: 1,995 wordt 2
  if (V && priceInValue) {
    const q = V.amount / priceInValue;
    const whole = Math.round(q);
    const snapped = h.type === "stock" && whole >= 1 && Math.abs(q - whole) / q < 0.02 ? whole : q;
    return { quantity: snapped, from: "value", value: V };
  }

  // 6. Een getal dat niet op een koers lijkt
  const notPrice = bare.find((n) => priceDistance(n.value) > PRICE_LIKE);
  if (notPrice) return { quantity: notPrice.value, from: "screenshot", value: V };
  return { quantity: null, from: "missing", value: V };
}

/**
 * Maakt van de herkende beleggingen voorstellen voor posities: het aantal (zie `resolveQuantity`) en
 * de aankoopprijs (uit waarde − winst/verlies, een bedrag met "gem. aankoopprijs" ervoor, anders de
 * huidige koers). `toEur` = hoeveel euro één eenheid van een valuta is.
 */
export function toProposals(
  holdings: ParsedHolding[],
  prices: Record<string, { price: number; currency: string }>,
  toEur: Record<string, number>,
): ImportProposal[] {
  const convert: Convert = (amount, from, to) => {
    if (from === to) return amount;
    const a = toEur[from];
    const b = toEur[to];
    return a && b ? (amount * a) / b : null;
  };
  return holdings.map((h) => {
    const live = prices[`${h.type}:${h.symbol}`];
    const currency = live?.currency ?? "USD";
    const price = live?.price && live.price > 0 ? live.price : null;
    const { quantity, from, value } = resolveQuantity(h, price, currency, convert);
    const toAsset = (amount: number, cur: string) => convert(amount, cur, currency) ?? amount;
    const plausible = (bp: number) => bp > 0 && (!price || Math.abs(Math.log(bp / price)) < Math.log(50));

    let buyPrice = price ?? 0;
    let buyPriceFrom: ImportProposal["buyPriceFrom"] = "current";
    // Winst/verlies: een bedrag met teken, of zonder valuta in de valuta van de waarde
    const signedBare = h.numbers.find((n) => n.sign && !n.currency);
    const pnl = h.pnl ?? (signedBare && value ? { amount: signedBare.sign === "-" ? -signedBare.value : signedBare.value, currency: value.currency } : null);
    if (quantity && value && pnl) {
      const cost = value.amount - (convert(pnl.amount, pnl.currency, value.currency) ?? pnl.amount);
      const bp = toAsset(cost / quantity, value.currency);
      if (cost > 0 && plausible(bp)) {
        buyPrice = bp;
        buyPriceFrom = "screenshot";
      }
    }
    if (buyPriceFrom === "current") {
      const labelled = h.numbers.find((n) => !n.sign && BUY_LABEL.test(n.prev));
      if (labelled) {
        const bp = toAsset(labelled.value, labelled.currency ?? value?.currency ?? currency);
        if (plausible(bp)) {
          buyPrice = bp;
          buyPriceFrom = "screenshot";
        }
      }
    }

    return {
      symbol: h.symbol,
      type: h.type,
      name: h.name,
      quantity,
      buyPrice,
      currency,
      price: price ?? 0,
      quantityFrom: from,
      buyPriceFrom,
      screenshotValue: value ? toAsset(value.amount, value.currency) : null,
      buyPriceShown:
        value && value.currency !== currency && buyPrice > 0
          ? { amount: convert(buyPrice, currency, value.currency) ?? buyPrice, currency: value.currency }
          : null,
      source: h.source,
    };
  });
}
