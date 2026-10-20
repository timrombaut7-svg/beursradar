import type { FearGreed, MacroData, MarketTick, Mover, NewspaperStory } from "@/types";

/**
 * Schrijft het hoofdartikel van de krant uit de marktcijfers van vandaag, in gewone taal.
 * Puur rekenwerk (geen AI), zodat het altijd werkt en elke minuut kan verversen.
 */

const pct = (v: number, digits = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits).replace(".", ",")}%`;
const num = (v: number, digits = 2) => v.toFixed(digits).replace(".", ",");

/** "a, b en c" */
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} en ${items[items.length - 1]}`);

/** "Meta Platforms, Inc." → "Meta Platforms" */
const shortName = (name: string) => name.replace(/,?\s+(inc|corp|corporation|n\.?v|plc|ltd|holdings?|co)\.?$/i, "").trim();

function move(v: number): "sterk omhoog" | "omhoog" | "vlak" | "omlaag" | "sterk omlaag" {
  if (v >= 1.5) return "sterk omhoog";
  if (v >= 0.3) return "omhoog";
  if (v > -0.3) return "vlak";
  if (v > -1.5) return "omlaag";
  return "sterk omlaag";
}

const verb = (v: number) =>
  ({ "sterk omhoog": "stijgt flink", omhoog: "stijgt", vlak: "staat bijna stil", omlaag: "daalt", "sterk omlaag": "zakt flink" })[move(v)];

function mood(fg: FearGreed): string {
  const v = fg.value;
  if (v < 25) return "extreme angst";
  if (v < 45) return "angst";
  if (v <= 55) return "neutraal";
  if (v <= 75) return "hebzucht";
  return "extreme hebzucht";
}

export function writeLead(input: {
  markets: MarketTick[];
  movers: { up: Mover[]; down: Mover[] };
  fearGreed: { stock: FearGreed; crypto: FearGreed };
  macro: MacroData;
}): NewspaperStory {
  const by = (s: string) => input.markets.find((m) => m.symbol === s);
  const sp = by("^GSPC");
  const aex = by("^AEX");
  const btc = by("BTC");
  const nasdaq = by("^IXIC");
  const gold = by("GC=F");
  const oil = by("CL=F");
  const eur = by("EURUSD=X");
  const { stock: fgStock, crypto: fgCrypto } = input.fearGreed;

  // --- Kop ---------------------------------------------------------------
  const ref = sp ?? aex;
  let headline: string;
  let tone: NewspaperStory["tone"] = "hold";
  if (!ref && !btc) headline = "De markten in één oogopslag";
  else if (ref && btc && ref.changePct >= 0.3 && btc.changePct >= 1) {
    headline = "Groene dag: aandelen én crypto in de plus";
    tone = "bull";
  } else if (ref && btc && ref.changePct <= -0.3 && btc.changePct <= -1) {
    headline = "Rode dag: aandelen én crypto lager";
    tone = "bear";
  } else if (ref && Math.abs(ref.changePct) >= 1.5) {
    headline = ref.changePct > 0 ? `Beurs in feeststemming: ${ref.name} ${pct(ref.changePct)}` : `Klap op de beurs: ${ref.name} ${pct(ref.changePct)}`;
    tone = ref.changePct > 0 ? "bull" : "bear";
  } else if (btc && Math.abs(btc.changePct) >= 4) {
    headline = btc.changePct > 0 ? `Bitcoin schiet omhoog: ${pct(btc.changePct)}` : `Bitcoin onder druk: ${pct(btc.changePct)}`;
    tone = btc.changePct > 0 ? "bull" : "bear";
  } else if (ref && ref.changePct >= 0.3) {
    headline = `Beurs kleurt groen: ${ref.name} ${pct(ref.changePct)}`;
    tone = "bull";
  } else if (ref && ref.changePct <= -0.3) {
    headline = `Beurs kleurt rood: ${ref.name} ${pct(ref.changePct)}`;
    tone = "bear";
  } else headline = "Rustige dag op de beurzen";

  // --- Intro -------------------------------------------------------------
  const parts: string[] = [];
  if (sp) parts.push(`de S&P 500 ${verb(sp.changePct)} (${pct(sp.changePct)})`);
  if (aex) parts.push(`de AEX ${verb(aex.changePct)} (${pct(aex.changePct)})`);
  if (btc) parts.push(`Bitcoin ${verb(btc.changePct)} (${pct(btc.changePct)})`);
  const closed = sp && sp.marketState !== "open" ? " Wall Street is nu dicht: dit zijn de laatste koersen." : "";
  const intro = parts.length
    ? `Vandaag: ${list(parts)}.${closed}`
    : "De koersen zijn op dit moment niet bereikbaar. Hieronder lees je het laatste nieuws.";

  // --- Alinea's ------------------------------------------------------------
  const paragraphs: string[] = [];
  if (nasdaq && sp) {
    const tech = nasdaq.changePct - sp.changePct;
    paragraphs.push(
      Math.abs(tech) >= 0.4
        ? `Technologie ${tech > 0 ? "doet het beter" : "doet het slechter"} dan de rest van de markt: de Nasdaq ${verb(nasdaq.changePct)} (${pct(nasdaq.changePct)}).`
        : `De techbeurs Nasdaq beweegt mee met de rest (${pct(nasdaq.changePct)}).`,
    );
  }
  const top = input.movers.up[0];
  const flop = input.movers.down[0];
  if (top || flop) {
    const bits: string[] = [];
    if (top && top.changePct > 0) bits.push(`${shortName(top.name)} de grootste stijger (${pct(top.changePct)})`);
    if (flop && flop.changePct < 0) bits.push(`${shortName(flop.name)} de grootste daler (${pct(flop.changePct)})`);
    if (bits.length) paragraphs.push(`In onze lijst is ${list(bits)}.`);
  }
  paragraphs.push(
    `De stemming onder beleggers: ${mood(fgStock)} bij aandelen (${fgStock.value}/100) en ${mood(fgCrypto)} bij crypto (${fgCrypto.value}/100).`,
  );
  const extra: string[] = [];
  if (gold) extra.push(`goud ${verb(gold.changePct)} (${pct(gold.changePct)})`);
  if (oil) extra.push(`olie ${verb(oil.changePct)} (${pct(oil.changePct)})`);
  if (eur) extra.push(`de euro is ${num(eur.price, 3)} dollar waard`);
  if (extra.length) paragraphs.push(`Verder: ${list(extra)}.`);
  const { macro } = input;
  if (macro.fedFundsRate !== null || macro.inflationYoY !== null) {
    const r =
      macro.fedFundsRate !== null
        ? `De Amerikaanse rente staat op ${num(macro.fedFundsRate)}%${macro.rateTrend === "falling" ? " en daalt" : macro.rateTrend === "rising" ? " en stijgt" : ""}`
        : "";
    const i = macro.inflationYoY !== null ? `de inflatie is ${num(macro.inflationYoY, 1)}%${macro.inflationTrend === "falling" ? " en loopt terug" : macro.inflationTrend === "rising" ? " en loopt op" : ""}` : "";
    paragraphs.push(`${[r, i].filter(Boolean).join("; ")}.`.replace(/^d/, "D"));
  }

  // --- Wat betekent dit voor jou? -------------------------------------------
  const fg = Math.round((fgStock.value + fgCrypto.value) / 2);
  const takeaway =
    fg < 25
      ? "Veel beleggers zijn bang. Dat zijn vaak de momenten waarop geduldige beleggers goedkoop kunnen instappen, maar spreid je aankopen en houd je aan je stop-loss."
      : fg > 75
        ? "Veel beleggers zijn hebberig. Dan is de kans op een terugval groter: koop niet alles in één keer en neem gerust wat winst."
        : tone === "bear"
          ? "Een rode dag is normaal. Voor de lange termijn verandert één dag weinig; paniekverkopen is meestal geen goed idee."
          : tone === "bull"
            ? "Een groene dag is fijn, maar ga er niet blind achteraan. Kijk bij Kansen welke signalen echt bewezen zijn."
            : "Geen grote bewegingen: een goed moment om rustig je plan te bekijken. Kijk bij Kansen wat er nu interessant is.";

  return { headline, intro, paragraphs, takeaway, tone };
}
