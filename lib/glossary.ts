/**
 * Woordenlijst: moeilijke woorden en afkortingen uit de app, in gewone taal.
 * Wordt gebruikt op de pagina /uitleg, in de tik-uitleg bij cijfers en door de assistent.
 */

export type GlossaryCategory = "basis" | "grafiek" | "advies" | "risico" | "bedrijf" | "crypto" | "markt" | "app";

export const CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  basis: "Basis",
  grafiek: "Grafiek & indicatoren",
  advies: "Advies & tradeplan",
  risico: "Risico & resultaat",
  bedrijf: "Bedrijfscijfers",
  crypto: "Crypto",
  markt: "Markt & stemming",
  app: "In deze app",
};

export interface GlossaryTerm {
  id: string;
  term: string;
  /** Andere schrijfwijzen zoals ze in de app staan (kleine letters niet nodig) */
  aliases?: string[];
  category: GlossaryCategory;
  /** Eén of twee zinnen, zonder vakjargon */
  short: string;
  /** Hoe je het gebruikt / waar je op let */
  tip?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  // --- Basis -----------------------------------------------------------------
  { id: "aandeel", term: "Aandeel", category: "basis", short: "Een klein stukje eigendom van een bedrijf. Gaat het bedrijf beter, dan wordt je stukje meestal meer waard." },
  { id: "etf", term: "ETF", aliases: ["etf's", "indexfonds", "tracker"], category: "basis", short: "Een mandje met heel veel aandelen tegelijk, dat je als één aandeel koopt. Bijvoorbeeld de 500 grootste Amerikaanse bedrijven in één keer.", tip: "Goed om je risico te spreiden: als één bedrijf het slecht doet, merk je dat weinig." },
  { id: "crypto", term: "Crypto", aliases: ["cryptomunt", "coin", "munt"], category: "basis", short: "Digitaal geld zoals Bitcoin (BTC) en Ethereum (ETH). Kan in korte tijd heel hard stijgen én dalen." },
  { id: "ticker", term: "Ticker", aliases: ["symbool"], category: "basis", short: "De korte code van een belegging, zoals AAPL voor Apple, ASML voor ASML of BTC voor Bitcoin." },
  { id: "beurs", term: "Beurs", aliases: ["exchange", "nasdaq", "nyse", "euronext"], category: "basis", short: "De markt waar aandelen worden gekocht en verkocht. NASDAQ en NYSE zitten in Amerika, Euronext Amsterdam in Nederland." },
  { id: "koers", term: "Koers", aliases: ["prijs"], category: "basis", short: "De prijs van één aandeel of munt op dit moment." },
  { id: "rendement", term: "Rendement", aliases: ["rendement (1j)", "return"], category: "basis", short: "Hoeveel je erbij verdiend (of verloren) hebt, in procenten. +10% betekent: van €100 is €110 geworden." },
  { id: "dividend", term: "Dividend", aliases: ["dividendrendement"], category: "basis", short: "Een deel van de winst dat een bedrijf uitkeert aan de aandeelhouders. Dividendrendement = het dividend per jaar als percentage van de koers." },
  { id: "bull-bear", term: "Bullish / bearish", aliases: ["bull", "bear", "bullish", "bearish"], category: "basis", short: "Bullish (de stier) = verwachting dat de koers stijgt. Bearish (de beer) = verwachting dat de koers daalt." },
  { id: "long-short", term: "Long / short", aliases: ["long", "short"], category: "basis", short: "Long = je koopt en hoopt dat de koers stijgt. Short = je verdient als de koers daalt (dat doet deze app niet; wij geven alleen koopadvies)." },
  { id: "24u", term: "24u hoog / laag", aliases: ["24u hoog", "24u laag", "24u"], category: "basis", short: "De hoogste en laagste koers van de afgelopen 24 uur." },
  { id: "52w", term: "52w hoog / laag", aliases: ["52w hoog", "52w laag", "52 weken"], category: "basis", short: "De hoogste en laagste koers van het afgelopen jaar (52 weken)." },
  { id: "volume", term: "Volume", category: "basis", short: "Hoeveel aandelen of munten er die dag verhandeld zijn. Veel volume bij een stijging betekent dat veel mensen meedoen: dat maakt de beweging sterker." },
  { id: "marktkapitalisatie", term: "Marktkapitalisatie", aliases: ["marktkap.", "market cap", "marktwaarde"], category: "basis", short: "De totale waarde van een bedrijf of munt op de beurs: koers × aantal aandelen (of munten)." },
  { id: "dca", term: "Gespreid instappen", aliases: ["dca", "spreiden in tijd", "periodiek beleggen"], category: "basis", short: "Niet alles in één keer kopen, maar bijvoorbeeld elke maand een vast bedrag. Zo koop je soms duur en soms goedkoop, en hoef je het perfecte moment niet te raden." },
  { id: "ter", term: "TER (kosten)", aliases: ["ter", "lopende kosten"], category: "basis", short: "De jaarlijkse kosten van een ETF, in procenten van je inleg. 0,07% betekent €0,70 per jaar op €1.000." },
  { id: "accumulerend", term: "Accumulerend / distribuerend", aliases: ["accumulerend", "distribuerend", "acc", "dist"], category: "basis", short: "Accumulerend: de ETF steekt het dividend automatisch terug in de belegging. Distribuerend: je krijgt het dividend uitbetaald." },

  // --- Grafiek & indicatoren ---------------------------------------------------
  { id: "candle", term: "Candle (kaars)", aliases: ["candles", "kaars", "dagcandles", "candlestick"], category: "grafiek", short: "Eén staafje in de grafiek. Het toont de begin-, eind-, hoogste en laagste koers van een periode. Groen = gestegen, rood = gedaald." },
  { id: "timeframe", term: "1H / 1D / 1W / 1M / 1Y", aliases: ["1h", "1d", "1w", "1m", "1y", "tijdsframe", "timeframe"], category: "grafiek", short: "Hoeveel tijd één candle voorstelt: 1 uur (1H), 1 dag (1D), 1 week (1W), 1 maand (1M). 1Y toont dagcandles van het laatste jaar." },
  { id: "ema", term: "EMA (gemiddelde lijn)", aliases: ["ema 20", "ema 50", "ema 200", "ema20", "ema50", "ema200", "ema 20/50/200", "ema 50 / 200", "moving average", "voortschrijdend gemiddelde"], category: "grafiek", short: "De gemiddelde koers van de laatste 20, 50 of 200 dagen, als lijn in de grafiek. Recente dagen tellen iets zwaarder.", tip: "Koers boven de EMA 200 = de lange trend is omhoog. EMA 50 boven EMA 200 heet een 'uptrend'." },
  { id: "rsi", term: "RSI", aliases: ["rsi (14)", "relative strength index"], category: "grafiek", short: "Een getal van 0 tot 100 dat aangeeft hoe hard de koers de laatste 14 dagen gestegen of gedaald is.", tip: "Boven 70 = 'overbought': misschien te snel gestegen. Onder 30 = 'oversold': misschien te hard gezakt." },
  { id: "overbought", term: "Overbought / oversold", aliases: ["overbought", "oversold", "overgekocht", "oververkocht"], category: "grafiek", short: "Overbought: in korte tijd zoveel gekocht dat een terugval kan volgen. Oversold: zoveel verkocht dat een herstel kan volgen." },
  { id: "macd", term: "MACD", aliases: ["macd hist.", "macd histogram", "signaallijn", "signaal", "bull cross", "bear cross"], category: "grafiek", short: "Een meter voor de snelheid van de trend. Gaat de MACD-lijn boven de signaallijn ('bull cross'), dan krijgt de stijging vaart. Eronder ('bear cross') = de daling krijgt vaart.", tip: "Het histogram (de staafjes) toont het verschil tussen de twee lijnen: groen en groeiend = steeds meer kracht omhoog." },
  { id: "bollinger", term: "Bollinger Bands", aliases: ["bollinger", "bollinger %b", "bb boven", "bb onder", "%b", "bw", "bandbreedte"], category: "grafiek", short: "Twee lijnen boven en onder de koers die laten zien wat een 'normale' beweging is. %B zegt waar de koers zit: 0 = onderste band, 1 = bovenste band.", tip: "Smalle banden (lage BW, bandbreedte) betekenen rust; vaak volgt daarna een grote beweging." },
  { id: "atr", term: "ATR", aliases: ["atr (14)", "average true range"], category: "grafiek", short: "Hoeveel de koers gemiddeld per dag beweegt, in geld (over 14 dagen). Wordt gebruikt om de stop-loss op een veilige afstand te zetten." },
  { id: "support", term: "Support (steun)", aliases: ["support", "s", "steun", "s1", "s2"], category: "grafiek", short: "Een koersniveau waar de koers eerder bleef 'hangen' en weer omhoog ging. In de grafiek: groene stippellijn met S." },
  { id: "weerstand", term: "Weerstand (resistance)", aliases: ["weerstand", "resistance", "r", "r1", "r2"], category: "grafiek", short: "Een koersniveau waar de koers eerder niet doorheen kwam en weer zakte. In de grafiek: rode stippellijn met R." },
  { id: "pivot", term: "Pivot", aliases: ["p", "pivot point"], category: "grafiek", short: "Een rekenkundig middenpunt van gisteren (hoog, laag en slot). Erboven = eerder positief, eronder = eerder negatief." },
  { id: "swing", term: "Swing", aliases: ["swing trade", "swing high", "swing low"], category: "grafiek", short: "Een duidelijke top of bodem in de grafiek. Een swing trade is een korte belegging van een paar dagen tot weken." },
  { id: "fibonacci", term: "Fibonacci", aliases: ["fib", "fibonacci-niveaus"], category: "grafiek", short: "Vaste verhoudingen (zoals 38,2% en 61,8%) van de laatste grote beweging. Beleggers letten op die niveaus, waardoor de koers er vaak reageert." },
  { id: "trend", term: "Trend / uptrend", aliases: ["uptrend", "downtrend", "trendstructuur"], category: "grafiek", short: "De richting op de lange termijn. Uptrend = hogere toppen en bodems, de koers gaat in grote lijnen omhoog. Downtrend = omgekeerd." },
  { id: "momentum", term: "Momentum", category: "grafiek", short: "Hoeveel vaart een beweging heeft. Sterk momentum omhoog = de koers stijgt en blijft dat waarschijnlijk nog even doen." },

  // --- Advies & tradeplan ------------------------------------------------------
  { id: "korte-termijn", term: "Korte termijn / lange termijn", aliases: ["korte termijn", "lange termijn", "kt", "lt"], category: "advies", short: "Korte termijn = een paar dagen tot ± 4 weken (snel in en uit). Lange termijn = maanden tot jaren vasthouden." },
  { id: "advies", term: "Sterk koop / Koop / Houden / Verkoop", aliases: ["koop", "sterk koop", "houden", "verkoop", "sterk verkoop", "buy", "hold", "sell"], category: "advies", short: "Het advies van de app, gebaseerd op alle cijfers samen. 'Houden' betekent: heb je het al, houd het; heb je het niet, wacht nog even." },
  { id: "score", term: "Score (−100 tot +100)", aliases: ["score"], category: "advies", short: "Hoe positief of negatief het totaalbeeld is. Boven 0 = meer redenen om te kopen, onder 0 = meer redenen om niet te kopen." },
  { id: "pijlers", term: "Pijlers", aliases: ["technisch", "fundamenteel", "sentiment", "risico", "weging", "sentiment & macro"], category: "advies", short: "De vier onderdelen van de analyse: Technisch (de grafiek), Fundamenteel (bedrijfscijfers), Sentiment & macro (stemming en economie) en Risico. Elk telt mee met een eigen gewicht ('weging')." },
  { id: "zekerheid", term: "Zekerheid (%)", aliases: ["confidence", "zekerheid"], category: "advies", short: "Hoe zeker de app van zijn advies is. Laag als de signalen elkaar tegenspreken of als er weinig echte data was." },
  { id: "instapzone", term: "Instapzone", aliases: ["instap", "entry"], category: "advies", short: "Het prijsgebied waarin het slim is om te kopen. Staat de koers erboven, wacht dan liever op een kleine daling." },
  { id: "target", term: "Target (koersdoel)", aliases: ["target 1", "target 2", "target 1 (conservatief)", "target 2 (agressief)", "koersdoel", "doel"], category: "advies", short: "De koers waarop je (een deel) winst neemt. Target 1 is voorzichtig en vaker haalbaar, target 2 is ambitieuzer." },
  { id: "stop-loss", term: "Stop-loss", aliases: ["stop", "stoploss"], category: "advies", short: "De koers waarop je verkoopt om een groter verlies te voorkomen. Een soort noodrem: zakt de koers tot daar, dan stap je uit.", tip: "Bij de meeste brokers kun je een stop-loss-order instellen, zodat dit automatisch gebeurt." },
  { id: "rr", term: "Risk/Reward (R/R)", aliases: ["r/r", "risk/reward", "risk/reward ratio", "risico/opbrengst"], category: "advies", short: "Hoeveel je kunt winnen tegenover hoeveel je kunt verliezen. 1 : 2 betekent: je riskeert €1 om €2 te verdienen." },
  { id: "bewezen", term: "Bewezen / zwak bewijs", aliases: ["bewezen", "zwak", "onvoldoende bewijs", "historische toets", "evidence"], category: "advies", short: "De app test elk koopsignaal op ± 5 jaar koersgeschiedenis van die belegging. 'Bewezen' = het signaal leverde vroeger vaker winst op dan op een willekeurige dag kopen. Alleen bewezen signalen worden aangeraden." },
  { id: "kern-satelliet", term: "Kern & satelliet", aliases: ["kern", "satelliet", "core", "satellite"], category: "advies", short: "Een verdeling van je budget: de kern (meestal brede ETF's) is de veilige basis, de satellieten (losse aandelen of crypto) zijn kleinere, spannendere posities." },
  { id: "reserve", term: "Reserve", category: "advies", short: "Het deel van je budget dat de app nu niet laat beleggen, omdat er te weinig goede kansen zijn. Houd het achter de hand." },

  // --- Risico & resultaat ------------------------------------------------------
  { id: "volatiliteit", term: "Volatiliteit", aliases: ["volatiliteit 30d (jaarbasis)", "volatility", "beweeglijkheid"], category: "risico", short: "Hoe wild de koers op en neer gaat. 20% is rustig (zoals een brede ETF), 60% of meer is heel wild (zoals veel crypto)." },
  { id: "beta", term: "Beta", aliases: ["beta vs s&p 500", "beta vs bitcoin"], category: "risico", short: "Hoe sterk een belegging meebeweegt met de hele markt. Beta 1 = net zoveel, 2 = dubbel zo hard op en neer, 0,5 = half zo hard." },
  { id: "drawdown", term: "Max drawdown", aliases: ["max drawdown (1j)", "drawdown", "maximale daling"], category: "risico", short: "De grootste daling van een top naar een bodem in die periode. −30% betekent: op het slechtste moment stond je 30% onder de top." },
  { id: "sharpe", term: "Sharpe ratio", aliases: ["sharpe ratio (1j)", "sharpe"], category: "risico", short: "Rendement gedeeld door risico. Hoger is beter: boven 1 is goed, boven 2 is heel goed, onder 0 betekent verlies." },
  { id: "var", term: "VaR (Value at Risk)", aliases: ["var", "var 95%", "value at risk"], category: "risico", short: "Het verlies op een slechte dag. VaR 95% = 3% betekent: op 19 van de 20 dagen verlies je minder dan 3%." },
  { id: "backtest", term: "Backtest", aliases: ["backtest — laatste 12 maanden"], category: "risico", short: "Een test op het verleden: wat had de strategie van de app opgeleverd als je hem het afgelopen jaar had gevolgd?" },
  { id: "buy-hold", term: "Buy & Hold", aliases: ["buy & hold", "buy and hold", "kopen en vasthouden"], category: "risico", short: "Gewoon kopen en laten staan, zonder iets te doen. De vergelijking: deed de strategie het beter dan simpelweg vasthouden?" },
  { id: "winrate", term: "Win rate", aliases: ["winrate", "slagingspercentage"], category: "risico", short: "Hoeveel procent van de trades met winst eindigde." },
  { id: "exposure", term: "Tijd in markt", aliases: ["exposure"], category: "risico", short: "Hoeveel procent van de tijd de strategie echt belegd was (in plaats van in cash)." },
  { id: "trades", term: "Trades", aliases: ["trade"], category: "risico", short: "Eén keer kopen en later weer verkopen heet één trade." },
  { id: "track-record", term: "Track record", aliases: ["trackrecord", "resultaten van eerdere tips"], category: "risico", short: "Hoe eerdere tips van de app het in het echt deden. Zo kun je zien of de app te vertrouwen is." },

  // --- Bedrijfscijfers ---------------------------------------------------------
  { id: "pe", term: "P/E (koers/winst)", aliases: ["p/e", "p/e (trailing)", "forward p/e", "k/w", "koers-winstverhouding", "pe ratio"], category: "bedrijf", short: "Hoeveel jaar winst je betaalt voor één aandeel. P/E 20 = je betaalt 20 keer de jaarwinst. 'Forward' gebruikt de verwachte winst van volgend jaar.", tip: "Lager is goedkoper, maar snelgroeiende bedrijven hebben vaak een hoge P/E." },
  { id: "peg", term: "PEG ratio", aliases: ["peg"], category: "bedrijf", short: "De P/E gedeeld door de winstgroei. Rond 1 of lager = redelijk geprijsd voor hoe hard het bedrijf groeit." },
  { id: "eps", term: "EPS (winst per aandeel)", aliases: ["eps", "winst per aandeel"], category: "bedrijf", short: "De winst van het bedrijf gedeeld door het aantal aandelen." },
  { id: "yoy", term: "Omzetgroei YoY", aliases: ["yoy", "omzetgroei", "winstgroei", "year over year"], category: "bedrijf", short: "Hoeveel de omzet groeide ten opzichte van hetzelfde moment vorig jaar (YoY = year over year)." },
  { id: "schuld", term: "Schuld / EV", aliases: ["schuld / ev", "debt to equity", "schuld/eigen vermogen"], category: "bedrijf", short: "Schulden gedeeld door het eigen vermogen van het bedrijf. Onder 1x is meestal gezond; veel hoger betekent veel leningen." },
  { id: "fcf", term: "Free Cash Flow", aliases: ["fcf", "vrije kasstroom"], category: "bedrijf", short: "Het geld dat een bedrijf echt overhoudt na alle kosten en investeringen. Positief en groeiend is een goed teken." },
  { id: "winstmarge", term: "Winstmarge", aliases: ["marge", "profit margin"], category: "bedrijf", short: "Hoeveel van elke euro omzet overblijft als winst. 20% = van €100 omzet blijft €20 winst over." },
  { id: "sector", term: "Sector", category: "bedrijf", short: "De branche van het bedrijf, zoals technologie, energie of gezondheidszorg." },
  { id: "analisten", term: "Koersdoel analisten", aliases: ["analisten", "analistenadvies", "koersdoel analisten"], category: "bedrijf", short: "De gemiddelde koers die professionele analisten over ± een jaar verwachten. Een inschatting, geen zekerheid." },

  // --- Crypto ------------------------------------------------------------------
  { id: "fdv", term: "FDV", aliases: ["fully diluted valuation"], category: "crypto", short: "De waarde als álle munten die ooit bestaan al in omloop waren. Veel hoger dan de marktkapitalisatie = er komen nog veel munten bij." },
  { id: "rang", term: "Rang", aliases: ["rank", "market cap rank"], category: "crypto", short: "De plaats in de lijst van grootste cryptomunten (Bitcoin is #1)." },
  { id: "tvl", term: "TVL", aliases: ["total value locked"], category: "crypto", short: "Hoeveel geld er vastgezet is in de apps van dat netwerk (DeFi). Meer TVL = het netwerk wordt meer gebruikt." },
  { id: "supply", term: "Circulerend / max supply", aliases: ["circulerend", "max supply", "circ. / max", "supply", "circulating supply"], category: "crypto", short: "Circulerend = hoeveel munten er nu in omloop zijn. Max supply = hoeveel er ooit maximaal komen (∞ = geen maximum)." },
  { id: "crypto-inflatie", term: "Inflatie p.j. (crypto)", aliases: ["inflatie p.j."], category: "crypto", short: "Hoeveel nieuwe munten er per jaar bij komen. Veel nieuwe munten kunnen de koers drukken." },
  { id: "mvrv", term: "MVRV Z", aliases: ["mvrv z (proxy)", "mvrv", "mvrv z-score"], category: "crypto", short: "Hoe ver de koers boven of onder zijn eigen jaargemiddelde ligt. Heel hoog (boven ± 3) = historisch duur, onder 0 = historisch goedkoop." },
  { id: "ath", term: "ATH", aliases: ["van ath", "all-time high"], category: "crypto", short: "All-time high: de hoogste koers ooit. 'Van ATH −40%' betekent: 40% onder de hoogste koers ooit." },
  { id: "adressen", term: "Actieve adressen", aliases: ["tx-volume / dag", "transacties"], category: "crypto", short: "Hoeveel 'rekeningen' per dag iets doen op het netwerk, en hoeveel geld er per dag overgemaakt wordt. Meer gebruik is gezond." },
  { id: "dominantie", term: "BTC dominantie", aliases: ["btc dominantie", "bitcoin dominantie"], category: "crypto", short: "Hoeveel procent van alle cryptogeld in Bitcoin zit. Daalt het, dan stroomt geld vaak naar andere munten (altcoins)." },

  // --- Markt & stemming --------------------------------------------------------
  { id: "fear-greed", term: "Fear & Greed", aliases: ["fear & greed", "angst & hebzucht", "fear and greed", "fng"], category: "markt", short: "Een meter van 0 tot 100 voor de stemming van beleggers. 0 = extreme angst, 100 = extreme hebzucht.", tip: "Extreme angst is soms juist een koopmoment; extreme hebzucht een moment om voorzichtig te zijn." },
  { id: "nieuws-sentiment", term: "Nieuwssentiment", aliases: ["nieuws", "news sentiment"], category: "markt", short: "Of het recente nieuws over deze belegging vooral positief of negatief is." },
  { id: "macro", term: "Macro", aliases: ["macro-economie", "economie"], category: "markt", short: "De grote economie: rente, inflatie en groei. Die beïnvloeden alle beleggingen tegelijk." },
  { id: "fed-rente", term: "Fed rente", aliases: ["fed", "fed funds rate", "rente"], category: "markt", short: "De rente van de Amerikaanse centrale bank. Een dalende rente is meestal goed voor aandelen en crypto, een stijgende rente juist niet." },
  { id: "cpi", term: "Inflatie (CPI)", aliases: ["cpi", "inflatie"], category: "markt", short: "Hoeveel duurder alles in een jaar werd. Hoge inflatie leidt vaak tot een hogere rente." },
  { id: "us10y", term: "US 10j rente", aliases: ["us 10j", "10-jaarsrente", "us10y"], category: "markt", short: "De rente op Amerikaanse staatsleningen van 10 jaar. Stijgt die hard, dan worden aandelen vaak minder aantrekkelijk." },
  { id: "sp500", term: "S&P 500", aliases: ["s&p", "spy"], category: "markt", short: "De 500 grootste Amerikaanse bedrijven samen; wordt gebruikt als maatstaf voor 'de markt'." },

  // --- In deze app -------------------------------------------------------------
  { id: "live-mock", term: "Live / mock", aliases: ["live", "mock", "databronnen", "mock-data"], category: "app", short: "Live = echte, actuele gegevens. Mock = voorbeeldgegevens, gebruikt als een bron even niet bereikbaar is. Op mock-data geeft de app nooit advies." },
  { id: "vooruitblik", term: "Vooruitblik / Verwacht", aliases: ["vooruitblik", "verwacht", "voorspelling", "middenscenario", "waaier"], category: "app", short: "De stippellijn en waaier na de laatste koers. Ze tonen hoe de koers vroeger verder ging na een vergelijkbaar beeld. 'Middenscenario' is de middelste uitkomst.", tip: "De gekleurde banden: in 5 en 8 van de 10 gevallen bleef de koers daarbinnen. Het is geen garantie." },
  { id: "kans-op-hoger", term: "Kans op hoger", category: "app", short: "Hoe vaak de koers in vergelijkbare situaties vroeger hoger stond aan het einde van de vooruitblik." },
  { id: "percentiel", term: "Percentiel", aliases: ["p10", "p50", "p90", "mediaan"], category: "app", short: "Een manier om uitkomsten te ordenen. De mediaan (50e percentiel) is precies de middelste uitkomst: de helft deed het beter, de helft slechter." },
  { id: "kansen", term: "Kansen", aliases: ["koopkansen"], category: "app", short: "De pagina met beleggingen waarvoor nu een bewezen koopsignaal is, per termijn." },
  { id: "watchlist", term: "Watchlist", aliases: ["volglijst", "favorieten"], category: "app", short: "Je lijst met beleggingen die je in de gaten wilt houden (het sterretje)." },
  { id: "portfolio", term: "Portfolio", aliases: ["portefeuille", "posities", "positie"], category: "app", short: "Alles wat je bezit aan beleggingen. Een positie is één belegging met het aantal dat je hebt en je aankoopprijs." },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const INDEX = new Map<string, GlossaryTerm>();
for (const t of GLOSSARY) {
  for (const key of [t.term, ...(t.aliases ?? [])]) {
    const k = norm(key);
    if (!INDEX.has(k)) INDEX.set(k, t);
  }
}

/** Het woordenlijst-item voor een label zoals het in de app staat ("RSI (14)", "Max drawdown (1j)"), of null. */
export function findTerm(label: string): GlossaryTerm | null {
  const k = norm(label);
  if (!k) return null;
  const exact = INDEX.get(k);
  if (exact) return exact;
  // Zonder toevoeging tussen haakjes: "Sharpe ratio (1j)" → "sharpe ratio"
  const bare = k.replace(/\s*\(.*\)\s*$/, "").trim();
  return (bare && INDEX.get(bare)) || null;
}

const DEFINE_RE =
  /(?:^|\s)(?:wat (?:is|zijn|betekent|betekenen|houdt)|wat bedoel(?:en)? (?:je|jullie|ze) met|leg|uitleg(?: over| van| bij)?)\s+(?:(?:een|de|het|eigenlijk|precies|nou|nu)\s+)*(.+)$/;

/**
 * Een vraag naar de betekenis van een woord ("wat is een stop-loss?", "leg RSI uit")
 * → dat woord uit de woordenlijst, of null. Het woord moet direct na de vraag staan,
 * zodat "wat is de beste crypto?" géén uitlegvraag is.
 */
export function findDefinitionQuestion(text: string): GlossaryTerm | null {
  const m = norm(text).replace(/[?!.,:;"]/g, " ").replace(/\s+/g, " ").trim().match(DEFINE_RE);
  if (!m) return null;
  const rest = `${m[1].trim()} `;
  let best: { term: GlossaryTerm; len: number } | null = null;
  for (const [key, term] of INDEX) {
    if (key.length < 2 || !rest.startsWith(key)) continue;
    // Het woord moet compleet zijn: "rsi " of "etf's", niet "rsi" in "rsiko"
    const next = rest.charAt(key.length);
    if (next !== " " && next !== "'" && next !== "s") continue;
    if (next === "s" && rest.charAt(key.length + 1) !== " ") continue;
    if (!best || key.length > best.len) best = { term, len: key.length };
  }
  return best?.term ?? null;
}

/** Filtert de woordenlijst op een zoekterm (in naam, afkortingen en uitleg). */
export function searchGlossary(query: string, category?: GlossaryCategory | null): GlossaryTerm[] {
  const q = norm(query);
  return GLOSSARY.filter(
    (t) =>
      (!category || t.category === category) &&
      (!q || [t.term, ...(t.aliases ?? []), t.short].some((s) => norm(s).includes(q))),
  ).sort((a, b) => {
    if (!q) return 0;
    // Treffers in de naam eerst
    const rank = (t: GlossaryTerm) => ([t.term, ...(t.aliases ?? [])].some((s) => norm(s).startsWith(q)) ? 0 : 1);
    return rank(a) - rank(b);
  });
}
