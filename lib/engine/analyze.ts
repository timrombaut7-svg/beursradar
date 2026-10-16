import type { Analysis, AssetMeta, AssetType, Candle, DataSource, Pillar, PillarScore, RiskMetrics } from "@/types";
import { ANALYSIS_TIMEFRAME } from "@/lib/timeframes";
import { getCryptoCandles, getCryptoFundamentals, getCryptoQuote } from "@/lib/api/crypto";
import { getStockCandles, getStockFundamentals, getStockQuote } from "@/lib/api/stocks";
import { getCryptoFearGreed, getStockFearGreed } from "@/lib/api/sentiment";
import { getNews } from "@/lib/api/news";
import { getMacro } from "@/lib/api/macro";
import { findInUniverse } from "@/lib/api/universe";
import { cached, mockMode } from "@/lib/api/http";
import { assertResolvable } from "@/lib/api/guard";
import { getLivePrice } from "@/lib/api/livePrices";
import { applyLivePrice } from "./live";
import { aggregateSentiment } from "@/lib/nlp/sentiment";
import { beta, historicalVaR, historicalVolatility, maxDrawdown, sharpe } from "@/lib/indicators";
import { computeSeries, technicalSnapshot } from "./technical";
import { buildPillar, fundamentalFactors, riskFactors, sentimentFactors, technicalFactors, verdict } from "./scoring";
import { buildTradePlan } from "./tradePlan";
import { runBacktest } from "./backtest";
import { longEvidence, planShape, shortEvidence } from "./evidence";

/** Lange historie (± 5 jaar dagcandles) voor de historische toets van signalen. */
export const HISTORY_SPEC = {
  stock: { ...ANALYSIS_TIMEFRAME, bars: 1260 },
  crypto: { ...ANALYSIS_TIMEFRAME, bars: 1825 },
} as const;

export async function getCandles(symbol: string, type: AssetType, spec = ANALYSIS_TIMEFRAME) {
  return type === "crypto" ? getCryptoCandles(symbol, spec) : getStockCandles(symbol, spec);
}

export function computeRisk(candles: Candle[], benchmark: Candle[] | null, benchmarkName: string, barsPerYear: number): RiskMetrics {
  const closes = candles.map((c) => c.close);
  const yearCloses = closes.slice(-barsPerYear);
  const vol = historicalVolatility(closes, 30, barsPerYear);
  return {
    volatility30d: vol,
    volatilityScore: Math.round(Math.min(100, (vol / 1.5) * 100)),
    beta: benchmark ? beta(candles, benchmark, barsPerYear) : null,
    benchmark: benchmarkName,
    maxDrawdown1y: maxDrawdown(yearCloses),
    return1y: yearCloses[yearCloses.length - 1] / yearCloses[0] - 1,
    sharpe1y: sharpe(yearCloses, barsPerYear),
    var95Daily: historicalVaR(yearCloses),
  };
}

/** Volledige 4-pijler analyse + beslissing + tradeplan + backtest voor één asset. */
export async function analyzeAsset(rawSymbol: string, type: AssetType): Promise<Analysis> {
  const symbol = rawSymbol.toUpperCase();
  const entry = findInUniverse(symbol, type);
  const barsPerYear = type === "crypto" ? 365 : 252;
  const benchmarkSymbol = type === "crypto" ? "BTC" : "SPY";

  const [history, bench, macro, live] = await Promise.all([
    getCandles(symbol, type, HISTORY_SPEC[type]),
    symbol === benchmarkSymbol ? Promise.resolve(null) : getCandles(benchmarkSymbol, type),
    getMacro(),
    getLivePrice(symbol, type).catch(() => null),
  ]);
  // De analyse kijkt naar de laatste ± 2 jaar; de toets gebruikt de volledige historie
  const main = { candles: history.candles.slice(-ANALYSIS_TIMEFRAME.bars), live: history.live };
  // De meest recente live koers telt mee in alle indicatoren en signalen
  const candles = live ? applyLivePrice(main.candles, live) : main.candles;
  const candlesLive = main.live;
  assertResolvable(symbol, type, candlesLive);
  if (candles.length < 60) throw new Error(`Onvoldoende koersdata voor ${symbol}`);

  const closes = candles.map((c) => c.close);
  const [baseQuote, fundamentals, fearGreed] = await Promise.all([
    type === "crypto" ? getCryptoQuote(symbol, candles, candlesLive) : getStockQuote(symbol, candles, candlesLive),
    type === "crypto"
      ? getCryptoFundamentals(symbol, candles[candles.length - 1].close, closes)
      : getStockFundamentals(symbol, candles[candles.length - 1].close),
    type === "crypto" ? getCryptoFearGreed() : getStockFearGreed(bench ?? main),
  ]);
  const quote = live
    ? { ...baseQuote, price: live.price, change24h: live.change, changePct24h: live.changePct, currency: live.currency || baseQuote.currency, source: "live" as const, updatedAt: live.time }
    : baseQuote;
  const news = await getNews(symbol, quote.name, type);

  const asset: AssetMeta = {
    symbol,
    name: quote.name || entry?.name || symbol,
    type,
    exchange: entry?.exchange ?? (type === "crypto" ? "Crypto" : undefined),
    coingeckoId: entry?.coingeckoId,
    currency: quote.currency,
  };

  // --- Technisch ---------------------------------------------------------
  const series = computeSeries(candles);
  const technical = technicalSnapshot(candles, series, barsPerYear);
  // Gebruik de actuele quote-prijs als die live is (candles kunnen een dag achterlopen)
  if (quote.source === "live") technical.price = quote.price;

  // --- Risico ------------------------------------------------------------
  const risk = computeRisk(candles, bench?.candles ?? (symbol === benchmarkSymbol ? candles : null), benchmarkSymbol === "SPY" ? "S&P 500" : "Bitcoin", barsPerYear);

  // --- Sentiment ---------------------------------------------------------
  const newsScore = Math.round(aggregateSentiment(news.items) * 100) / 100;

  // --- Pijlers & beslissing ---------------------------------------------
  // Alleen echte data telt mee in de score. Mock-data (fallback) wordt nog wel getoond,
  // maar nooit gebruikt om iets aan te raden — behalve in expliciete demo-modus.
  const usable = (source: DataSource) => source !== "mock" || mockMode();
  const sentiment = sentimentFactors(fearGreed, newsScore, news.live || mockMode() ? news.items.length : 0, macro, type, symbol).filter(
    (f) =>
      (f.id !== "fng" || usable(fearGreed.source)) && ((f.id !== "rates" && f.id !== "inflation") || usable(macro.source)),
  );
  const pillars: Record<Pillar, PillarScore> = {
    technical: buildPillar("technical", technicalFactors(series, candles.length - 1, technical)),
    fundamental: buildPillar(
      "fundamental",
      usable(fundamentals.source) ? fundamentalFactors(fundamentals, technical.price, mockMode()) : [],
    ),
    sentiment: buildPillar("sentiment", sentiment),
    risk: buildPillar("risk", riskFactors(risk, type)),
  };

  const dataSources: Record<string, DataSource> = {
    koersen: candlesLive ? "live" : "mock",
    quote: quote.source,
    fundamentals: fundamentals.source,
    "fear & greed": fearGreed.source,
    nieuws: news.live ? "live" : "mock",
    macro: macro.source,
  };
  const liveShare = Object.values(dataSources).filter((s) => s !== "mock").length / Object.keys(dataSources).length;

  const shortTerm = verdict(pillars, "short", liveShare);
  const longTerm = verdict(pillars, "long", liveShare);
  const tradePlan = buildTradePlan(technical, shortTerm);
  const backtest = runBacktest(candles, series, { testBars: barsPerYear });

  // Historische toets: werkte dit soort signaal en plan vroeger op deze asset?
  // Zonder de lopende (nog niet afgesloten) dag, zodat alleen afgeronde trades meetellen.
  const histCandles = history.candles;
  const histSeries = computeSeries(histCandles);
  const shape = planShape(tradePlan, technical.atr, technical.price);
  const evidence = {
    short: shortEvidence(histCandles, histSeries, shape, barsPerYear),
    long: longEvidence(histCandles, histSeries, barsPerYear),
  };

  return {
    asset,
    quote,
    generatedAt: Date.now(),
    technical,
    fundamentals,
    risk,
    sentiment: { fearGreed, news: news.items, newsScore, macro },
    pillars,
    shortTerm,
    longTerm,
    tradePlan,
    backtest,
    evidence,
    dataSources,
  };
}

/** Analyse met 1 minuut server-cache; gedeeld door de analysepagina en de kansen-scan. */
export function getAnalysis(symbol: string, type: AssetType): Promise<Analysis> {
  // Kort cachen: de live koers ververst elke 15 s, signalen worden elke minuut herberekend
  return cached(`analysis:${type}:${symbol.toUpperCase()}`, 60, () => analyzeAsset(symbol, type));
}
