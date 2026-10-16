import type { Analysis, AssetType, Advice } from "@/types";
import { UNIVERSE, findInUniverse } from "@/lib/api/universe";
import { cached } from "@/lib/api/http";
import { getAnalysis } from "@/lib/engine/analyze";
import { scanUniverse, toOpportunity } from "@/lib/engine/signals";
import { sellAdvice } from "@/lib/engine/sellAdvice";
import { getCryptoFearGreed, getStockFearGreed } from "@/lib/api/sentiment";
import { getStockCandles } from "@/lib/api/stocks";
import { formatPct, formatPrice } from "@/lib/format";
import type { ChatPosition } from "./tools";

/**
 * Gratis, ingebouwde assistent: geen AI-dienst nodig. Herkent de vraag (welk asset,
 * wat de gebruiker wil weten) en bouwt het antwoord uit de live analyses van de app.
 */

export type Intent = "down" | "up" | "buy" | "sell" | "overview" | "opportunities" | "portfolio" | "market" | "help";

export interface ParsedQuestion {
  intent: Intent;
  asset: { symbol: string; type: AssetType } | null;
  horizon: "short" | "long" | null;
  kind: AssetType | null;
}

// Extra namen waarmee mensen naar een asset verwijzen (kleine letters)
const ALIASES: Record<string, string[]> = {
  "stock:NVDA": ["nvidia"],
  "stock:AAPL": ["apple"],
  "stock:MSFT": ["microsoft"],
  "stock:ASML": ["asml"],
  "stock:TSLA": ["tesla"],
  "stock:AMZN": ["amazon"],
  "stock:GOOGL": ["google", "alphabet"],
  "stock:META": ["facebook", "meta platforms"],
  "stock:AMD": ["amd"],
  "stock:NFLX": ["netflix"],
  "stock:JPM": ["jpmorgan", "jp morgan"],
  "stock:V": ["visa"],
  "stock:KO": ["coca-cola", "coca cola", "cola"],
  "stock:JNJ": ["johnson & johnson", "johnson en johnson", "johnson"],
  "stock:XOM": ["exxon", "exxonmobil"],
  "stock:INTC": ["intel"],
  "stock:PLTR": ["palantir"],
  "stock:ADYEN.AS": ["adyen"],
  "stock:SHELL.AS": ["shell"],
  "stock:INGA.AS": ["ing groep", "ing bank"],
  "stock:PHIA.AS": ["philips"],
  "stock:SPY": ["s&p 500", "s&p", "sp500"],
  "stock:QQQ": ["nasdaq"],
  "crypto:BTC": ["bitcoin", "btc"],
  "crypto:ETH": ["ethereum", "ether", "eth"],
  "crypto:SOL": ["solana"],
  "crypto:XRP": ["ripple", "xrp"],
  "crypto:BNB": ["binance coin", "bnb"],
  "crypto:ADA": ["cardano"],
  "crypto:DOGE": ["dogecoin", "doge"],
  "crypto:AVAX": ["avalanche", "avax"],
  "crypto:LINK": ["chainlink"],
  "crypto:DOT": ["polkadot"],
  "crypto:MATIC": ["polygon", "matic"],
  "crypto:LTC": ["litecoin", "ltc"],
  "crypto:UNI": ["uniswap"],
  "crypto:TON": ["toncoin"],
};

// Tickers die mensen in hoofdletters schrijven maar anders heten in de catalogus
const UPPER_ALIASES: Record<string, string> = { ING: "stock:INGA.AS", PHILIPS: "stock:PHIA.AS", SHELL: "stock:SHELL.AS", ADYEN: "stock:ADYEN.AS" };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Zoekt welk asset in de tekst genoemd wordt (namen in kleine letters, tickers in hoofdletters). */
export function findAsset(text: string): { symbol: string; type: AssetType } | null {
  const lower = ` ${text.toLowerCase()} `;
  let best: { symbol: string; type: AssetType; at: number } | null = null;
  const consider = (symbol: string, type: AssetType, at: number) => {
    if (at >= 0 && (!best || at < best.at)) best = { symbol, type, at };
  };
  for (const [key, names] of Object.entries(ALIASES)) {
    const [type, symbol] = key.split(":") as [AssetType, string];
    for (const n of names) {
      const m = new RegExp(`[^a-z0-9]${escapeRe(n)}[^a-z0-9]`).exec(lower);
      if (m) consider(symbol, type, m.index);
    }
  }
  // Tickers alleen in HOOFDLETTERS, zodat gewone woorden ("link", "ton", "ing") niet matchen
  for (const u of UNIVERSE) {
    const base = u.symbol.replace(/\.AS$/, "");
    if (base.length < 2) continue;
    const m = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(base)}([^A-Za-z0-9]|$)`).exec(text);
    if (m) consider(u.symbol, u.type, m.index);
  }
  for (const [ticker, key] of Object.entries(UPPER_ALIASES)) {
    const m = new RegExp(`(^|[^A-Za-z0-9])${ticker}([^A-Za-z0-9]|$)`).exec(text);
    const [type, symbol] = key.split(":") as [AssetType, string];
    if (m) consider(symbol, type, m.index);
  }
  if (!best) return null;
  const { symbol, type } = best as { symbol: string; type: AssetType; at: number };
  return { symbol, type };
}

const has = (t: string, words: string[]) => words.some((w) => new RegExp(`(^|[^a-zà-ü])${w}`, "i").test(t));

export function parseQuestion(text: string, history: string[] = []): ParsedQuestion {
  const t = text.toLowerCase();
  let asset = findAsset(text);
  const ownAsset = asset !== null;
  // Korte vervolgvraag zonder asset ("en op lange termijn?", "gaat het dalen?"): neem het laatst genoemde asset
  const followUp =
    !ownAsset &&
    t.length < 60 &&
    (/^\s*(en|maar|ok[eé]?|dus)\b/.test(t) || has(t, ["lange termijn", "korte termijn", "dalen", "stijgen", "het kopen", "het verkopen"])) &&
    !has(t, ["beste", "welke", "aanrad", "kansen", "tip", "portfolio", "mijn ", "markt"]);
  if (followUp) {
    for (let i = history.length - 1; i >= 0 && !asset; i--) asset = findAsset(history[i]);
  }

  const horizon = has(t, ["lange termijn", "lang houden", "jaren", "jaar", "maanden", "langer"]) ? "long" : has(t, ["korte termijn", "weken", "week", "snel", "deze maand"]) ? "short" : null;
  const kind: AssetType | null = has(t, ["crypto", "munt", "coin"]) ? "crypto" : has(t, ["aandel", "aandeel", "bedrijf"]) ? "stock" : null;

  let intent: Intent;
  if (has(t, ["mijn portfolio", "mijn aandelen", "mijn posities", "mijn crypto", "wat ik heb", "mijn beleggingen", "portefeuille"])) intent = "portfolio";
  else if (asset && (ownAsset || followUp)) {
    if (has(t, ["dalen", "zakken", "crash", "omlaag", "vallen", "naar beneden", "dalend"])) intent = "down";
    else if (has(t, ["stijgen", "omhoog", "naar boven", "stijgend", "to the moon"])) intent = "up";
    else if (has(t, ["verkopen", "verkoop", "uitstappen", "eruit"])) intent = "sell";
    else if (has(t, ["kopen", "koop", "instappen", "investeren", "beleggen in", "goede koop", "erin"])) intent = "buy";
    else intent = "overview";
  } else if (has(t, ["verkopen", "verkoop"])) intent = "portfolio";
  else if (has(t, ["kopen", "koop", "aanraden", "aanrader", "raad", "welke", "beste", "kansen", "kans", "tip", "investeren", "beleggen", "interessant"])) intent = "opportunities";
  else if (has(t, ["markt", "stemming", "angst", "hebzucht", "fear", "greed", "sentiment", "beurs"])) intent = "market";
  else intent = "help";

  return { intent, asset: intent === "opportunities" || intent === "market" || intent === "help" || intent === "portfolio" ? null : asset, horizon, kind };
}

const ADVICE_WORDS: Record<Advice, string> = {
  STRONG_BUY: "sterk kopen",
  BUY: "kopen",
  HOLD: "houden (afwachten)",
  SELL: "verkopen",
  STRONG_SELL: "sterk verkopen",
};

const DISCLAIMER = "_Dit is geen financieel advies. Beleg alleen geld dat je kunt missen._";

function direction(advice: Advice): string {
  if (advice === "STRONG_BUY" || advice === "BUY") return "De signalen wijzen eerder op **stijgen** dan op dalen.";
  if (advice === "SELL" || advice === "STRONG_SELL") return "De signalen wijzen eerder op **dalen** dan op stijgen.";
  return "Er is **geen duidelijke richting**: stijgen en dalen zijn ongeveer even waarschijnlijk.";
}

function bullets(lines: string[]) {
  return lines.map((l) => `- ${l}`).join("\n");
}

function assetAnswer(a: Analysis, p: ParsedQuestion, positions: ChatPosition[]): string {
  const cur = a.asset.currency;
  const name = a.asset.name;
  const horizon = p.horizon ?? "short";
  const opp = toOpportunity(a, horizon);
  const verdict = horizon === "short" ? a.shortTerm : a.longTerm;
  const termNl = horizon === "short" ? "de komende weken" : "de lange termijn (maanden tot jaren)";
  const price = `${formatPrice(a.quote.price, cur)} (${formatPct(a.quote.changePct24h / 100, 2, true)} vandaag)`;
  const out: string[] = [];

  const position = positions.find((x) => x.symbol === a.asset.symbol && x.type === a.asset.type);

  if (p.intent === "sell" && position) {
    const adv = sellAdvice(position, a.quote.price, position.horizon === "long" ? a.longTerm : a.shortTerm);
    out.push(`Je hebt **${name}** gekocht voor ${formatPrice(position.buyPrice, cur)}. Nu: ${price}.`);
    out.push(`Advies van de app: **${adv.title}**. ${adv.reason}`);
  } else {
    if (p.intent === "down" || p.intent === "up") {
      out.push(`Niemand kan zeker weten of ${name} gaat ${p.intent === "down" ? "dalen" : "stijgen"}. Dit zeggen de signalen voor ${termNl}:`);
    } else {
      out.push(`**${name}** staat nu op ${price}.`);
    }
    out.push(`Signaal voor ${termNl}: **${ADVICE_WORDS[verdict.advice]}** (score ${verdict.score > 0 ? "+" : ""}${verdict.score} van −100 tot +100).`);
    out.push(direction(verdict.advice));
  }

  const { why, risks } = opp.explanation;
  if (why.length) out.push(`**Wat wijst omhoog:**\n${bullets(why.slice(0, 3))}`);
  if (risks.length) out.push(`**Wat wijst omlaag:**\n${bullets(risks.slice(0, 2))}`);

  const buyNow = verdict.advice === "BUY" || verdict.advice === "STRONG_BUY";
  if (p.intent === "buy" || p.intent === "overview" || p.intent === "up" || p.intent === "down") {
    if (buyNow && (horizon === "long" || a.tradePlan.direction === "long")) {
      out.push(`**Als je wilt kopen:** ${opp.explanation.plan}`);
      out.push(`**Hoe lang houden:** ${opp.hold.label}.`);
    } else if (p.intent === "buy") {
      const other = horizon === "short" ? a.longTerm : a.shortTerm;
      const otherBuy = other.advice === "BUY" || other.advice === "STRONG_BUY";
      out.push(
        `**Nu kopen?** Voor ${termNl} raadt de app dat nu niet aan.` +
          (otherBuy ? ` Voor de ${horizon === "short" ? "lange" : "korte"} termijn is het signaal wel ${ADVICE_WORDS[other.advice]}; vraag daar gerust naar.` : " Wacht liever tot het signaal verbetert."),
      );
    }
  }
  if (!p.horizon && a.longTerm.advice !== a.shortTerm.advice) {
    out.push(`Voor de lange termijn is het signaal: **${ADVICE_WORDS[a.longTerm.advice]}**.`);
  }
  if (a.dataSources.koersen === "mock") out.push("Let op: de koersdata zijn nu niet live, wees extra voorzichtig.");
  out.push(DISCLAIMER);
  return out.join("\n\n");
}

async function opportunitiesAnswer(p: ParsedQuestion): Promise<string> {
  const scan = await cached("scan:universe", 60, scanUniverse);
  const horizon = p.horizon ?? "short";
  const list = (horizon === "short" ? scan.short : scan.long).filter((o) => !p.kind || o.row.type === p.kind).slice(0, 5);
  const kindNl = p.kind === "crypto" ? "crypto" : p.kind === "stock" ? "aandelen" : "aandelen en crypto";
  const termNl = horizon === "short" ? "de korte termijn (weken)" : "de lange termijn (maanden tot jaren)";
  if (!list.length) {
    return `Op dit moment geeft geen ${kindNl} een koopsignaal voor ${termNl}. ${horizon === "short" ? "Vraag eens naar de lange termijn." : "Vraag eens naar de korte termijn."}\n\n${DISCLAIMER}`;
  }
  const lines = list.map(
    (o) =>
      `**${o.row.name} (${o.row.symbol})**: ${ADVICE_WORDS[o.advice]}, score +${o.score}. ${o.explanation.why[0] ?? ""} Houden: ${o.hold.label}.`,
  );
  return `De beste kansen in ${kindNl} voor ${termNl}, volgens de live analyses:\n\n${bullets(lines)}\n\nVraag naar één van deze voor het volledige plan (instapprijs, stop-loss, koersdoelen). Je ziet ze ook op de pagina **Kansen**.\n\n${DISCLAIMER}`;
}

async function portfolioAnswer(positions: ChatPosition[]): Promise<string> {
  if (!positions.length) {
    return "Je hebt nog geen aankopen vastgelegd. Klik op de pagina **Kansen** bij een aandeel op **Gekocht**, dan houd ik het voor je in de gaten en zeg ik wanneer je moet verkopen.";
  }
  const rows = await Promise.all(
    positions.slice(0, 20).map(async (p) => {
      try {
        const a = await getAnalysis(p.symbol, p.type);
        const adv = sellAdvice(p, a.quote.price, p.horizon === "long" ? a.longTerm : a.shortTerm);
        const pnl = a.quote.price / p.buyPrice - 1;
        return { order: adv.action === "SELL" ? 0 : adv.action === "TAKE_PROFIT" ? 1 : 2, line: `**${p.symbol}** (${formatPct(pnl, 1, true)}): **${adv.title}**. ${adv.reason}` };
      } catch {
        return { order: 3, line: `**${p.symbol}**: geen actuele data.` };
      }
    }),
  );
  rows.sort((x, y) => x.order - y.order);
  const action = rows.filter((r) => r.order < 2).length;
  return `${action ? `Bij ${action} van je ${rows.length} posities is actie nodig.` : `Bij geen van je ${rows.length} posities is nu actie nodig.`}\n\n${bullets(rows.map((r) => r.line))}\n\n${DISCLAIMER}`;
}

async function marketAnswer(): Promise<string> {
  const spy = await getStockCandles("SPY", { yahoo: "1d", seconds: 86400, bars: 300 });
  const [stock, crypto] = await Promise.all([getStockFearGreed(spy), getCryptoFearGreed()]);
  const mood = (v: number) => (v < 25 ? "extreme angst" : v < 45 ? "angst" : v <= 55 ? "neutraal" : v <= 75 ? "hebzucht" : "extreme hebzucht");
  return [
    `**Aandelen:** stemming ${stock.value}/100 (${mood(stock.value)}).`,
    `**Crypto:** stemming ${crypto.value}/100 (${mood(crypto.value)}).`,
    "Bij angst zijn koersen vaak laag en dat is historisch vaak een goed instapmoment. Bij hebzucht is de kans op een terugval groter.",
  ].join("\n\n");
}

const HELP =
  "Ik ben de gratis Beursradar-assistent. Je kunt me bijvoorbeeld vragen:\n\n" +
  bullets([
    "*Denk je dat NVIDIA gaat dalen?*",
    "*Moet ik Bitcoin kopen voor de lange termijn?*",
    "*Wat kan ik nu het beste kopen?* (of: *welke crypto?*)",
    "*Moet ik iets verkopen uit mijn portfolio?*",
    "*Hoe is de stemming op de markt?*",
  ]) +
  "\n\nNoem het aandeel of de crypto bij naam of ticker (bijv. ASML, Apple, BTC).";

/** Beantwoordt een vraag zonder AI-dienst. `report` toont tussenstappen in de UI. */
export async function answerLocally(
  question: string,
  history: string[],
  positions: ChatPosition[],
  report: (status: string) => void,
): Promise<string> {
  const p = parseQuestion(question, history);
  switch (p.intent) {
    case "portfolio":
      report("Je portfolio bekijken…");
      return portfolioAnswer(positions);
    case "opportunities":
      report("Koopkansen bekijken…");
      return opportunitiesAnswer(p);
    case "market":
      report("Marktstemming bekijken…");
      return marketAnswer();
    case "help":
      return HELP;
    default: {
      const asset = p.asset!;
      report(`Analyse van ${asset.symbol} ophalen…`);
      try {
        return assetAnswer(await getAnalysis(asset.symbol, asset.type), p, positions);
      } catch {
        const name = findInUniverse(asset.symbol, asset.type)?.name ?? asset.symbol;
        return `Ik kon nu geen actuele data voor ${name} ophalen. Probeer het zo nog eens.`;
      }
    }
  }
}
