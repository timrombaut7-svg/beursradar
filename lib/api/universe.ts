import type { AssetType, SearchResult } from "@/types";

/**
 * Lokale asset-catalogus. Wordt gebruikt voor directe autocomplete (zonder API-call),
 * voor het mappen van tickers naar CoinGecko-ids en als basis voor mock-data.
 * `basePrice` / `vol` / `drift` zijn alleen voor de mock-generator (indicatief).
 */
export interface UniverseEntry extends SearchResult {
  basePrice: number;
  /** geannualiseerde volatiliteit voor mock-data */
  vol: number;
  /** geannualiseerde drift voor mock-data */
  drift: number;
  sector?: string;
  /** Crypto: geschatte netto jaarlijkse inflatie van het aanbod */
  inflation?: number;
  maxSupply?: number | null;
  circulating?: number;
  binance?: string;
  /** Beursgenoteerd indexfonds (mandje met veel aandelen of grondstof) */
  etf?: boolean;
  /** Korte uitleg in gewone taal (bij ETF's: wat zit erin) */
  about?: string;
  /** ETF's met dezelfde groep volgen (vrijwel) dezelfde index */
  group?: string;
}

// Indicatieve startkoers en beweeglijkheid, alleen voor de mock-generator
const MOCK_ETF: Record<string, { basePrice: number; vol: number; drift: number }> = {
  SPY: { basePrice: 665, vol: 0.16, drift: 0.09 },
  VOO: { basePrice: 610, vol: 0.16, drift: 0.09 },
  QQQ: { basePrice: 600, vol: 0.2, drift: 0.12 },
  VTI: { basePrice: 330, vol: 0.17, drift: 0.09 },
  VT: { basePrice: 135, vol: 0.16, drift: 0.08 },
  DIA: { basePrice: 460, vol: 0.15, drift: 0.07 },
  IWM: { basePrice: 240, vol: 0.24, drift: 0.06 },
  SCHD: { basePrice: 28, vol: 0.15, drift: 0.06 },
  SMH: { basePrice: 300, vol: 0.35, drift: 0.2 },
  GLD: { basePrice: 370, vol: 0.15, drift: 0.08 },
  "VWRL.AS": { basePrice: 140, vol: 0.15, drift: 0.08 },
  "VWCE.DE": { basePrice: 140, vol: 0.15, drift: 0.08 },
  "IWDA.AS": { basePrice: 110, vol: 0.15, drift: 0.08 },
  "EMIM.AS": { basePrice: 36, vol: 0.18, drift: 0.05 },
  "VUSA.AS": { basePrice: 110, vol: 0.16, drift: 0.09 },
  "CSPX.AS": { basePrice: 640, vol: 0.16, drift: 0.09 },
};

export const STOCKS: UniverseEntry[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock", exchange: "NASDAQ", basePrice: 185, vol: 0.5, drift: 0.35, sector: "Technology" },
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", exchange: "NASDAQ", basePrice: 245, vol: 0.26, drift: 0.12, sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "stock", exchange: "NASDAQ", basePrice: 510, vol: 0.24, drift: 0.15, sector: "Technology" },
  { symbol: "ASML", name: "ASML Holding N.V.", type: "stock", exchange: "NASDAQ", basePrice: 920, vol: 0.38, drift: 0.1, sector: "Technology" },
  { symbol: "TSLA", name: "Tesla, Inc.", type: "stock", exchange: "NASDAQ", basePrice: 420, vol: 0.62, drift: 0.05, sector: "Consumer Cyclical" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", type: "stock", exchange: "NASDAQ", basePrice: 225, vol: 0.32, drift: 0.14, sector: "Consumer Cyclical" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", exchange: "NASDAQ", basePrice: 240, vol: 0.3, drift: 0.16, sector: "Communication Services" },
  { symbol: "META", name: "Meta Platforms, Inc.", type: "stock", exchange: "NASDAQ", basePrice: 720, vol: 0.38, drift: 0.18, sector: "Communication Services" },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc.", type: "stock", exchange: "NASDAQ", basePrice: 210, vol: 0.52, drift: 0.12, sector: "Technology" },
  { symbol: "NFLX", name: "Netflix, Inc.", type: "stock", exchange: "NASDAQ", basePrice: 1150, vol: 0.36, drift: 0.2, sector: "Communication Services" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock", exchange: "NYSE", basePrice: 300, vol: 0.22, drift: 0.12, sector: "Financial Services" },
  { symbol: "V", name: "Visa Inc.", type: "stock", exchange: "NYSE", basePrice: 345, vol: 0.2, drift: 0.1, sector: "Financial Services" },
  { symbol: "KO", name: "The Coca-Cola Company", type: "stock", exchange: "NYSE", basePrice: 68, vol: 0.15, drift: 0.05, sector: "Consumer Defensive" },
  { symbol: "JNJ", name: "Johnson & Johnson", type: "stock", exchange: "NYSE", basePrice: 185, vol: 0.17, drift: 0.04, sector: "Healthcare" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", type: "stock", exchange: "NYSE", basePrice: 115, vol: 0.25, drift: 0.02, sector: "Energy" },
  { symbol: "INTC", name: "Intel Corporation", type: "stock", exchange: "NASDAQ", basePrice: 36, vol: 0.55, drift: -0.05, sector: "Technology" },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", type: "stock", exchange: "NASDAQ", basePrice: 175, vol: 0.7, drift: 0.4, sector: "Technology" },
  { symbol: "ADYEN.AS", name: "Adyen N.V.", type: "stock", exchange: "AMS", basePrice: 1450, vol: 0.42, drift: 0.08, sector: "Technology" },
  { symbol: "SHELL.AS", name: "Shell plc", type: "stock", exchange: "AMS", basePrice: 31, vol: 0.24, drift: 0.04, sector: "Energy" },
  { symbol: "INGA.AS", name: "ING Groep N.V.", type: "stock", exchange: "AMS", basePrice: 21, vol: 0.27, drift: 0.1, sector: "Financial Services" },
  { symbol: "PHIA.AS", name: "Koninklijke Philips N.V.", type: "stock", exchange: "AMS", basePrice: 24, vol: 0.33, drift: 0.0, sector: "Healthcare" },
];

/** Bekende ETF's (indexfondsen). Technisch gewone beursnoteringen, dus type "stock". */
export const ETFS: UniverseEntry[] = [
  { symbol: "SPY", group: "sp500", name: "SPDR S&P 500 ETF Trust", about: "Volgt de S&P 500, de 500 grootste Amerikaanse bedrijven." },
  { symbol: "VOO", group: "sp500", name: "Vanguard S&P 500 ETF", about: "Volgt de S&P 500 (de 500 grootste Amerikaanse bedrijven), met heel lage kosten." },
  { symbol: "QQQ", name: "Invesco QQQ Trust", about: "Volgt de Nasdaq-100, de 100 grootste bedrijven op de Nasdaq (vooral tech)." },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", about: "Bijna de hele Amerikaanse aandelenmarkt in één keer, duizenden bedrijven groot en klein." },
  { symbol: "VT", group: "allworld", name: "Vanguard Total World Stock ETF", about: "Aandelen van over de hele wereld, duizenden bedrijven in tientallen landen." },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", about: "Volgt de Dow Jones, 30 grote en bekende Amerikaanse bedrijven." },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", about: "Volgt de Russell 2000, 2.000 kleinere Amerikaanse bedrijven." },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF", about: "Amerikaanse bedrijven die al jaren stabiel dividend uitkeren." },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", about: "De grootste chipbedrijven, zoals Nvidia, TSMC en ASML." },
  { symbol: "GLD", name: "SPDR Gold Shares", about: "Volgt de goudprijs; het fonds bezit echt goud in een kluis." },
  { symbol: "VWRL.AS", group: "allworld", name: "Vanguard FTSE All-World UCITS ETF", exchange: "AMS", about: "Duizenden bedrijven wereldwijd in één fonds; keert dividend uit. Verhandeld op de beurs van Amsterdam." },
  { symbol: "VWCE.DE", group: "allworld", name: "Vanguard FTSE All-World UCITS ETF (Acc)", exchange: "XETRA", about: "Hetzelfde wereldwijde mandje als VWRL, maar het dividend wordt automatisch herbelegd." },
  { symbol: "IWDA.AS", name: "iShares Core MSCI World UCITS ETF", exchange: "AMS", about: "Zo'n 1.400 grote bedrijven uit ontwikkelde landen (VS, Europa, Japan…); dividend wordt herbelegd." },
  { symbol: "EMIM.AS", name: "iShares Core MSCI Emerging Markets IMI UCITS ETF", exchange: "AMS", about: "Bedrijven uit opkomende landen zoals China, India, Taiwan en Brazilië." },
  { symbol: "VUSA.AS", group: "sp500", name: "Vanguard S&P 500 UCITS ETF", exchange: "AMS", about: "Volgt de S&P 500 (500 grootste Amerikaanse bedrijven). Verhandeld in Amsterdam." },
  { symbol: "CSPX.AS", group: "sp500", name: "iShares Core S&P 500 UCITS ETF (Acc)", exchange: "AMS", about: "Volgt de S&P 500; het dividend wordt automatisch herbelegd. Verhandeld in Amsterdam." },
].map((e) => ({
  type: "stock" as const,
  exchange: "NYSE",
  sector: "ETF",
  etf: true,
  ...MOCK_ETF[e.symbol],
  ...e,
}));

export const CRYPTOS: UniverseEntry[] = [
  { symbol: "BTC", name: "Bitcoin", type: "crypto", coingeckoId: "bitcoin", binance: "BTCUSDT", basePrice: 112000, vol: 0.5, drift: 0.3, inflation: 0.0084, maxSupply: 21_000_000, circulating: 19_930_000 },
  { symbol: "ETH", name: "Ethereum", type: "crypto", coingeckoId: "ethereum", binance: "ETHUSDT", basePrice: 4100, vol: 0.65, drift: 0.25, inflation: 0.007, maxSupply: null, circulating: 120_700_000 },
  { symbol: "SOL", name: "Solana", type: "crypto", coingeckoId: "solana", binance: "SOLUSDT", basePrice: 205, vol: 0.85, drift: 0.3, inflation: 0.043, maxSupply: null, circulating: 545_000_000 },
  { symbol: "XRP", name: "XRP", type: "crypto", coingeckoId: "ripple", binance: "XRPUSDT", basePrice: 2.7, vol: 0.85, drift: 0.2, inflation: 0.04, maxSupply: 100_000_000_000, circulating: 59_900_000_000 },
  { symbol: "BNB", name: "BNB", type: "crypto", coingeckoId: "binancecoin", binance: "BNBUSDT", basePrice: 1150, vol: 0.5, drift: 0.25, inflation: -0.01, maxSupply: 200_000_000, circulating: 139_200_000 },
  { symbol: "ADA", name: "Cardano", type: "crypto", coingeckoId: "cardano", binance: "ADAUSDT", basePrice: 0.75, vol: 0.85, drift: 0.05, inflation: 0.025, maxSupply: 45_000_000_000, circulating: 36_400_000_000 },
  { symbol: "DOGE", name: "Dogecoin", type: "crypto", coingeckoId: "dogecoin", binance: "DOGEUSDT", basePrice: 0.22, vol: 0.95, drift: 0.1, inflation: 0.034, maxSupply: null, circulating: 151_000_000_000 },
  { symbol: "AVAX", name: "Avalanche", type: "crypto", coingeckoId: "avalanche-2", binance: "AVAXUSDT", basePrice: 26, vol: 0.95, drift: 0.0, inflation: 0.05, maxSupply: 720_000_000, circulating: 422_000_000 },
  { symbol: "LINK", name: "Chainlink", type: "crypto", coingeckoId: "chainlink", binance: "LINKUSDT", basePrice: 20, vol: 0.85, drift: 0.15, inflation: 0.06, maxSupply: 1_000_000_000, circulating: 678_000_000 },
  { symbol: "DOT", name: "Polkadot", type: "crypto", coingeckoId: "polkadot", binance: "DOTUSDT", basePrice: 3.8, vol: 0.9, drift: -0.1, inflation: 0.08, maxSupply: null, circulating: 1_620_000_000 },
  { symbol: "MATIC", name: "Polygon (POL)", type: "crypto", coingeckoId: "polygon-ecosystem-token", binance: "POLUSDT", basePrice: 0.22, vol: 0.95, drift: -0.05, inflation: 0.02, maxSupply: null, circulating: 10_500_000_000 },
  { symbol: "LTC", name: "Litecoin", type: "crypto", coingeckoId: "litecoin", binance: "LTCUSDT", basePrice: 105, vol: 0.75, drift: 0.05, inflation: 0.017, maxSupply: 84_000_000, circulating: 76_300_000 },
  { symbol: "UNI", name: "Uniswap", type: "crypto", coingeckoId: "uniswap", binance: "UNIUSDT", basePrice: 8, vol: 0.95, drift: 0.05, inflation: 0.02, maxSupply: 1_000_000_000, circulating: 630_000_000 },
  { symbol: "TON", name: "Toncoin", type: "crypto", coingeckoId: "the-open-network", binance: "TONUSDT", basePrice: 2.8, vol: 0.8, drift: -0.1, inflation: 0.006, maxSupply: null, circulating: 2_560_000_000 },
];

export const UNIVERSE: UniverseEntry[] = [...STOCKS, ...ETFS, ...CRYPTOS];

export function isEtf(symbol: string): boolean {
  return Boolean(findInUniverse(symbol, "stock")?.etf);
}

export function findInUniverse(symbol: string, type?: AssetType): UniverseEntry | undefined {
  const s = symbol.toUpperCase();
  return UNIVERSE.find((u) => u.symbol.toUpperCase() === s && (!type || u.type === type));
}

/** Zoekt lokaal op ticker of naam; tickers die exact matchen komen eerst. */
export function searchUniverse(query: string, limit = 10): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = UNIVERSE.map((u) => {
    const sym = u.symbol.toLowerCase();
    const name = u.name.toLowerCase();
    let score = 0;
    if (sym === q) score = 100;
    else if (sym.startsWith(q)) score = 80;
    else if (name.startsWith(q)) score = 60;
    else if (name.includes(q)) score = 40;
    else if (sym.includes(q)) score = 30;
    return { u, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ u }) => ({
    symbol: u.symbol,
    name: u.name,
    type: u.type,
    exchange: u.exchange ?? (u.type === "crypto" ? "Crypto" : undefined),
    coingeckoId: u.coingeckoId,
  }));
}
