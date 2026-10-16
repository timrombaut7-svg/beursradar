"use client";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { Analysis, AssetType, Candle, LivePrice, MarketOverview, Quote, SearchResult, SignalRow, Timeframe } from "@/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export function useAnalysis(type: AssetType, symbol: string) {
  return useQuery({
    queryKey: ["analysis", type, symbol],
    queryFn: () => getJson<Analysis>(`/api/analysis/${type}/${encodeURIComponent(symbol)}`),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export interface CandleResponse {
  timeframe: Timeframe;
  live: boolean;
  visibleBars: number | null;
  candles: Candle[];
  overlays: Record<"ema20" | "ema50" | "ema200" | "bbUpper" | "bbLower" | "rsi" | "macd" | "macdSignal" | "macdHist", (number | null)[]>;
}

export function useCandles(type: AssetType, symbol: string, tf: Timeframe) {
  return useQuery({
    queryKey: ["candles", type, symbol, tf],
    queryFn: () => getJson<CandleResponse>(`/api/candles/${type}/${encodeURIComponent(symbol)}?tf=${tf}`),
    staleTime: tf === "1H" ? 60_000 : 300_000,
    placeholderData: keepPreviousData,
  });
}

export function useQuotes(assets: { symbol: string; type: AssetType }[]) {
  const key = assets.map((a) => `${a.type}:${a.symbol}`).sort().join(",");
  return useQuery({
    queryKey: ["quotes", key],
    queryFn: () => getJson<{ quotes: Quote[] }>(`/api/quotes?assets=${encodeURIComponent(key)}`).then((r) => r.quotes),
    enabled: assets.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarket() {
  return useQuery({
    queryKey: ["market"],
    queryFn: () => getJson<MarketOverview>("/api/market"),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q.toLowerCase()],
    queryFn: () => getJson<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.results),
    enabled: q.trim().length > 0,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAiSummary(type: AssetType, symbol: string, enabled: boolean) {
  return useQuery({
    queryKey: ["ai", type, symbol],
    queryFn: async () => {
      const res = await fetch(`/api/ai-summary?type=${type}&symbol=${encodeURIComponent(symbol)}`);
      return (await res.json()) as { enabled: boolean; summary?: string; error?: string };
    },
    enabled,
    staleTime: 30 * 60_000,
    retry: false,
  });
}

export function useScan() {
  return useQuery({
    queryKey: ["scan"],
    queryFn: () => getJson<{ scanned: number; generatedAt: number; opportunities: SignalRow[] }>("/api/scan"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useSignals(assets: { symbol: string; type: AssetType }[]) {
  const key = [...new Set(assets.map((a) => `${a.type}:${a.symbol}`))].sort().join(",");
  return useQuery({
    queryKey: ["signals", key],
    queryFn: () => getJson<{ signals: SignalRow[] }>(`/api/signals?assets=${encodeURIComponent(key)}`).then((r) => r.signals),
    enabled: key.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Live koersen, elke 15 seconden ververst (alleen als het tabblad zichtbaar is). */
export function useLivePrices(assets?: { symbol: string; type: AssetType }[]) {
  const key = assets ? [...new Set(assets.map((a) => `${a.type}:${a.symbol}`))].sort().join(",") : "";
  return useQuery({
    queryKey: ["prices", assets ? key || "none" : "universe"],
    queryFn: () =>
      getJson<{ prices: LivePrice[]; generatedAt: number }>(`/api/prices${key ? `?assets=${encodeURIComponent(key)}` : ""}`),
    enabled: !assets || key.length > 0,
    staleTime: 10_000,
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });
}
