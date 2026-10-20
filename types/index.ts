// ---------------------------------------------------------------------------
// Gedeelde domeintypes voor Beursradar
// ---------------------------------------------------------------------------

export type AssetType = "stock" | "crypto";

/** Waar een datapunt vandaan komt; "mock" betekent fallback-data. */
export type DataSource = "live" | "mock" | "derived";

export interface Candle {
  /** UNIX timestamp in seconden (UTC) */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "1H" | "1D" | "1W" | "1M" | "1Y";

export interface SearchResult {
  symbol: string;
  name: string;
  type: AssetType;
  exchange?: string;
  /** CoinGecko id voor crypto */
  coingeckoId?: string;
}

export interface AssetMeta extends SearchResult {
  currency: string;
  /** Beursgenoteerd indexfonds */
  etf?: boolean;
  /** Korte uitleg in gewone taal (bij ETF's: wat zit erin) */
  about?: string;
}

export interface Quote {
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  change24h: number;
  changePct24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  marketCap?: number;
  currency: string;
  source: DataSource;
  updatedAt: number;
}

export interface StockFundamentals {
  kind: "stock";
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  eps: number | null;
  revenueGrowthYoY: number | null; // fractie, 0.12 = 12%
  earningsGrowthYoY: number | null;
  debtToEquity: number | null; // als percentage zoals Yahoo rapporteert (150 = 1.5x)
  freeCashFlow: number | null;
  dividendYield: number | null; // fractie
  profitMargin: number | null;
  marketCap: number | null;
  beta: number | null;
  sector: string | null;
  analyst: {
    consensus: string | null; // "buy" | "hold" | ...
    recommendationMean: number | null; // 1 = strong buy ... 5 = strong sell
    targetMeanPrice: number | null;
    numberOfAnalysts: number | null;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };
  source: DataSource;
}

export interface CryptoFundamentals {
  kind: "crypto";
  marketCap: number | null;
  fullyDilutedValuation: number | null;
  marketCapRank: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  /** circulerend / max, 0..1 */
  supplyRatio: number | null;
  /** Geschatte jaarlijkse netto-inflatie, fractie (negatief = deflatoir) */
  annualInflation: number | null;
  totalValueLocked: number | null;
  athChangePct: number | null;
  network: {
    activeAddresses: number | null;
    activeAddressesChangePct: number | null;
    dailyTxVolumeUsd: number | null;
    source: DataSource;
  };
  /** Proxy voor MVRV Z-score: (marktwaarde - gerealiseerde-proxy) / std(marktwaarde) */
  mvrvZScore: number | null;
  source: DataSource;
}

export type Fundamentals = StockFundamentals | CryptoFundamentals;

export type SentimentLabel = "bullish" | "bearish" | "neutral";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: number;
  summary?: string;
  sentiment: SentimentLabel;
  sentimentScore: number; // -1..1
  source: DataSource;
}

export interface FearGreed {
  value: number; // 0..100
  label: string;
  previousClose?: number;
  weekAgo?: number;
  source: DataSource;
}

export interface MacroData {
  fedFundsRate: number | null;
  rateTrend: "rising" | "falling" | "stable";
  inflationYoY: number | null;
  inflationTrend: "rising" | "falling" | "stable";
  us10y: number | null;
  btcDominance: number | null;
  btcDominanceTrend: "rising" | "falling" | "stable";
  source: DataSource;
}

// ---------------------------------------------------------------------------
// Indicatoren
// ---------------------------------------------------------------------------

export type CrossType = "golden" | "death" | null;

export interface PriceLevel {
  price: number;
  /** Aantal keer dat het niveau getest is (sterkte) */
  strength: number;
  kind: "support" | "resistance";
  origin: "swing" | "pivot" | "52w";
}

export interface FibonacciLevels {
  swingHigh: number;
  swingLow: number;
  trend: "up" | "down";
  retracements: { ratio: number; price: number }[];
  extensions: { ratio: number; price: number }[];
}

export interface TechnicalSnapshot {
  price: number;
  rsi: number | null;
  rsiStatus: "overbought" | "oversold" | "neutral";
  macd: { macd: number; signal: number; histogram: number } | null;
  macdCross: "bullish" | "bearish" | null;
  macdCrossBarsAgo: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  maCross: CrossType;
  maCrossBarsAgo: number | null;
  bollinger: { upper: number; middle: number; lower: number; bandwidth: number; percentB: number } | null;
  bollingerSqueeze: boolean;
  atr: number | null;
  supports: PriceLevel[];
  resistances: PriceLevel[];
  pivots: { p: number; r1: number; r2: number; s1: number; s2: number } | null;
  fibonacci: FibonacciLevels | null;
  high52w: number;
  low52w: number;
}

export interface RiskMetrics {
  volatility30d: number; // geannualiseerd, fractie
  volatilityScore: number; // 0..100 (hoger = riskanter)
  beta: number | null;
  benchmark: string;
  maxDrawdown1y: number; // fractie (positief getal, 0.35 = -35%)
  return1y: number;
  sharpe1y: number | null;
  var95Daily: number; // 1-daagse 95% historical VaR, fractie
}

// ---------------------------------------------------------------------------
// Beslissingsengine
// ---------------------------------------------------------------------------

export type Pillar = "fundamental" | "technical" | "sentiment" | "risk";
export type Horizon = "short" | "long";

export interface ScoreFactor {
  id: string;
  pillar: Pillar;
  label: string;
  /** Leesbare waarde, bijv. "RSI 27.4" */
  value: string;
  points: number;
  maxPoints: number;
  horizons: Horizon[];
  explanation: string;
}

export type Advice = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface PillarScore {
  pillar: Pillar;
  score: number; // -100..100
  factors: ScoreFactor[];
}

export interface HorizonVerdict {
  horizon: Horizon;
  score: number; // -100..100
  advice: Advice;
  confidence: number; // 0..100
  weights: Record<Pillar, number>;
  pillarScores: Record<Pillar, number>;
}

export interface TradePlan {
  direction: "long" | "short";
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward1: number;
  riskReward2: number;
  riskPct: number;
  rationale: string[];
}

export interface BacktestTrade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  returnPct: number;
  exitReason: "signal" | "stop" | "end";
}

export interface BacktestResult {
  periodStart: number;
  periodEnd: number;
  strategyReturn: number;
  buyHoldReturn: number;
  trades: BacktestTrade[];
  winRate: number;
  maxDrawdown: number;
  exposure: number; // fractie van de tijd in de markt
  equityCurve: { time: number; strategy: number; buyHold: number }[];
}

/** Resultaat van de historische toets van een koopsignaal op één asset. */
export interface Evidence {
  horizon: Horizon;
  /** Aantal keer dat hetzelfde soort signaal in het verleden voorkwam (afgeronde trades) */
  samples: number;
  /** Aantal keer met winst */
  wins: number;
  winRate: number; // 0..1
  /** Gemiddeld resultaat per keer, na kosten (fractie) */
  avgReturn: number;
  /** Gemiddeld resultaat als je met hetzelfde plan op een willekeurige dag was ingestapt */
  baselineReturn: number;
  bestReturn: number;
  worstReturn: number;
  avgHoldDays: number;
  /** Getoetste periode in jaren */
  years: number;
  /** proven = werkte aantoonbaar; weak = werkte niet; insufficient = te weinig voorbeelden */
  verdict: "proven" | "weak" | "insufficient";
}

export interface ForecastPoint {
  time: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface Forecast {
  /** Aantal handelsdagen (aandelen) of dagen (crypto) vooruit */
  days: number;
  startTime: number;
  startPrice: number;
  points: ForecastPoint[];
  /** Deel van de vergelijkbare momenten waarin de koers na `days` hoger stond */
  probUp: number;
  medianReturn: number;
  lowReturn: number;
  highReturn: number;
  /** Aantal historische momenten waarop de waaier gebaseerd is */
  samples: number;
  /** "similar": dagen met een vergelijkbaar technisch beeld; "all": alle dagen */
  basis: "similar" | "all";
  /** Technische score van nu (0-100) */
  score: number;
}

export interface Analysis {
  asset: AssetMeta;
  quote: Quote;
  generatedAt: number;
  technical: TechnicalSnapshot;
  fundamentals: Fundamentals;
  risk: RiskMetrics;
  sentiment: {
    fearGreed: FearGreed;
    news: NewsItem[];
    newsScore: number; // -1..1
    macro: MacroData;
  };
  pillars: Record<Pillar, PillarScore>;
  shortTerm: HorizonVerdict;
  longTerm: HorizonVerdict;
  tradePlan: TradePlan;
  backtest: BacktestResult;
  /** Historische toets van het koopsignaal per termijn */
  evidence: Record<Horizon, Evidence>;
  /** Waaier van waarschijnlijke koersen voor de komende weken (null bij te weinig historie) */
  forecast: Forecast | null;
  /** Overzicht van welke bronnen live/mock waren */
  dataSources: Record<string, DataSource>;
}

export interface MarketOverview {
  cryptoFearGreed: FearGreed;
  stockFearGreed: FearGreed;
  macro: MacroData;
  movers: Quote[];
}

// ---------------------------------------------------------------------------
// Kansen & verkoopadvies
// ---------------------------------------------------------------------------

/** Compacte samenvatting van een analyse, voor lijsten. */
export interface SignalRow {
  symbol: string;
  name: string;
  type: AssetType;
  /** Beursgenoteerd indexfonds (mandje met veel aandelen of grondstof) */
  etf: boolean;
  currency: string;
  price: number;
  changePct24h: number;
  shortTerm: { advice: Advice; score: number; confidence: number };
  longTerm: { advice: Advice; score: number };
  tradePlan: TradePlan;
  /** De sterkste positieve redenen (factor-labels) */
  reasons: string[];
  /** Koersdata is live (niet mock) */
  pricesLive: boolean;
  /** Databronnen die het advies beïnvloeden en nu mock-data zijn (macro telt niet mee) */
  mockSources: string[];
  evidence: Record<Horizon, Evidence>;
}

export type SellAction = "SELL" | "TAKE_PROFIT" | "HOLD";

export interface SellAdvice {
  action: SellAction;
  title: string;
  reason: string;
  /** Afstand tot stop-loss en targets als fractie van de koers (positief = nog ruimte) */
  toStopPct: number | null;
  toTarget1Pct: number | null;
  toTarget2Pct: number | null;
}

// ---------------------------------------------------------------------------
// Live koersen & uitleg
// ---------------------------------------------------------------------------

export type MarketState = "open" | "pre" | "post" | "closed" | "24/7";

export interface LivePrice {
  symbol: string;
  type: AssetType;
  price: number;
  change: number;
  changePct: number; // in procenten, 1.5 = +1,5%
  /** Tijdstip van de laatste koers (ms) */
  time: number;
  marketState: MarketState;
  currency: string;
}

/** Uitleg in makkelijke taal, zonder vaktermen. */
export interface SignalExplanation {
  headline: string;
  why: string[];
  risks: string[];
  plan: string;
  hold: string;
}

export interface HoldEstimate {
  /** Bijv. "± 1–3 weken" of "maanden tot jaren" */
  label: string;
  minDays: number | null;
  maxDays: number | null;
}

/** Een koopkans voor één beleggingstermijn. */
export interface Opportunity {
  horizon: Horizon;
  row: SignalRow;
  score: number;
  advice: Advice;
  plan: {
    entryLow: number;
    entryHigh: number;
    stopLoss: number;
    target1: number | null;
    target2: number | null;
    riskPct: number;
  };
  hold: HoldEstimate;
  explanation: SignalExplanation;
  /** Andere ETF's die dezelfde index volgen (alleen de beste wordt als kans getoond) */
  alternatives?: string[];
}
