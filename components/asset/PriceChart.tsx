"use client";
import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { AssetType, Forecast, TechnicalSnapshot, Timeframe } from "@/types";
import { useCandles } from "@/lib/hooks";
import { useUi } from "@/lib/store/ui";
import { TIMEFRAMES } from "@/lib/timeframes";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

type Point = { time: UTCTimestamp; value: number };

export function PriceChart({
  type,
  symbol,
  technical,
  forecast,
}: {
  type: AssetType;
  symbol: string;
  technical?: TechnicalSnapshot;
  forecast?: Forecast | null;
}) {
  const { timeframe, setTimeframe, overlays, toggleOverlay, theme } = useUi();
  const { data, isLoading, isError, error } = useCandles(type, symbol, timeframe);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Zoom/scroll bewaren als de grafiek elke minuut met nieuwe koersen wordt herbouwd
  const viewRef = useRef<{ key: string; from: number; to: number; bars: number } | null>(null);
  // De vooruitblik is in dagen gerekend en past dus alleen op dagcandles
  const daily = TIMEFRAMES[timeframe].seconds === 86400;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !data?.candles.length) return;

    const bull = cssVar("--bull");
    const bear = cssVar("--bear");
    const muted = cssVar("--muted");
    const border = cssVar("--border");
    const hold = cssVar("--hold");
    const accent = cssVar("--accent");

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: muted,
        fontSize: 11,
        panes: { separatorColor: border, separatorHoverColor: border },
      },
      grid: { vertLines: { color: `${border}55` }, horzLines: { color: `${border}55` } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: timeframe === "1H", secondsVisible: false },
    });
    chartRef.current = chart;

    const t = (x: number) => x as UTCTimestamp;
    const candles = data.candles;
    const line = (arr: (number | null)[]): Point[] =>
      arr.flatMap((v, i) => (v === null ? [] : [{ time: t(candles[i].time), value: v }]));

    // --- Pane 0: prijs + overlays ---------------------------------------
    const price = chart.addSeries(CandlestickSeries, {
      upColor: bull,
      downColor: bear,
      borderVisible: false,
      wickUpColor: bull,
      wickDownColor: bear,
    });
    price.setData(candles.map((c) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));

    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(candles.map((c) => ({ time: t(c.time), value: c.volume, color: c.close >= c.open ? `${bull}40` : `${bear}40` })));

    const lineOpts = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
    if (overlays.ema) {
      chart.addSeries(LineSeries, { ...lineOpts, color: accent, title: "EMA20" }).setData(line(data.overlays.ema20));
      chart.addSeries(LineSeries, { ...lineOpts, color: hold, title: "EMA50" }).setData(line(data.overlays.ema50));
      chart.addSeries(LineSeries, { ...lineOpts, color: "#a855f7", lineWidth: 2, title: "EMA200" }).setData(line(data.overlays.ema200));
    }
    if (overlays.bollinger) {
      const bbOpts = { ...lineOpts, color: `${muted}`, lineStyle: LineStyle.Dashed };
      chart.addSeries(LineSeries, bbOpts).setData(line(data.overlays.bbUpper));
      chart.addSeries(LineSeries, bbOpts).setData(line(data.overlays.bbLower));
    }
    if (overlays.levels && technical) {
      for (const s of technical.supports.slice(0, 3)) {
        price.createPriceLine({ price: s.price, color: bull, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "S" });
      }
      for (const r of technical.resistances.slice(0, 3)) {
        price.createPriceLine({ price: r.price, color: bear, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "R" });
      }
    }

    // --- Vooruitblik: waaier van waarschijnlijke koersen na de laatste candle ------
    let ahead = 0;
    if (overlays.forecast && forecast && daily) {
      const last = candles[candles.length - 1];
      // Vanaf de laatste koers in de grafiek, zodat de lijnen er naadloos op aansluiten
      const scale = last.close / forecast.startPrice;
      const pts = forecast.points.filter((p) => p.time > last.time);
      ahead = pts.length;
      const fan = (key: "p10" | "p25" | "p50" | "p75" | "p90"): Point[] => [
        { time: t(last.time), value: last.close },
        ...pts.map((p) => ({ time: t(p.time), value: p[key] * scale })),
      ];
      const fcOpts = { ...lineOpts, color: `${accent}cc` };
      chart.addSeries(LineSeries, { ...fcOpts, lineStyle: LineStyle.Dotted }).setData(fan("p90"));
      chart.addSeries(LineSeries, { ...fcOpts, lineStyle: LineStyle.Dotted }).setData(fan("p10"));
      chart.addSeries(LineSeries, { ...fcOpts, color: `${accent}88` }).setData(fan("p75"));
      chart.addSeries(LineSeries, { ...fcOpts, color: `${accent}88` }).setData(fan("p25"));
      chart
        .addSeries(LineSeries, { ...lineOpts, color: accent, lineWidth: 2, lineStyle: LineStyle.Dashed, lastValueVisible: true, title: "Verwacht" })
        .setData(fan("p50"));
    }

    // --- Pane 1: RSI -----------------------------------------------------
    const rsi = chart.addSeries(LineSeries, { ...lineOpts, color: "#a855f7", lastValueVisible: true, title: "RSI" }, 1);
    rsi.setData(line(data.overlays.rsi));
    rsi.createPriceLine({ price: 70, color: bear, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: "" });
    rsi.createPriceLine({ price: 30, color: bull, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false, title: "" });

    // --- Pane 2: MACD ----------------------------------------------------
    const hist = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, 2);
    hist.setData(
      data.overlays.macdHist.flatMap((v, i) =>
        v === null ? [] : [{ time: t(candles[i].time), value: v, color: v >= 0 ? `${bull}99` : `${bear}99` }],
      ),
    );
    chart.addSeries(LineSeries, { ...lineOpts, color: accent, title: "MACD" }, 2).setData(line(data.overlays.macd));
    chart.addSeries(LineSeries, { ...lineOpts, color: hold, title: "Signaal" }, 2).setData(line(data.overlays.macdSignal));

    const panes = chart.panes();
    panes[0]?.setStretchFactor(3);
    panes[1]?.setStretchFactor(0.9);
    panes[2]?.setStretchFactor(0.9);

    const viewKey = `${type}:${symbol}:${timeframe}`;
    const saved = viewRef.current?.key === viewKey ? viewRef.current : null;
    if (saved) {
      // Stond je bij de nieuwste koers, schuif dan mee met nieuwe candles
      const shift = saved.to >= saved.bars - 1 ? candles.length + ahead - saved.bars : 0;
      chart.timeScale().setVisibleLogicalRange({ from: saved.from + shift, to: saved.to + shift });
    } else if (data.visibleBars && candles.length > data.visibleBars) {
      chart.timeScale().setVisibleLogicalRange({ from: candles.length - data.visibleBars, to: candles.length + ahead + 3 });
    } else chart.timeScale().fitContent();

    return () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (range) viewRef.current = { key: viewKey, from: range.from, to: range.to, bars: candles.length + ahead };
      chart.remove();
      chartRef.current = null;
    };
  }, [data, overlays, technical, forecast, daily, timeframe, theme, type, symbol]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1" role="group" aria-label="Tijdsframe">
          {(Object.keys(TIMEFRAMES) as Timeframe[]).map((tf) => (
            <button
              key={tf}
              title={TIMEFRAMES[tf].description}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-xs",
                timeframe === tf ? "bg-panel-2 text-text" : "text-muted hover:text-text",
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {(
            [
              ["ema", "EMA 20/50/200"],
              ["bollinger", "Bollinger"],
              ["levels", "S/R"],
              ["forecast", "Voorspelling"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => toggleOverlay(k)}
              className={cn(
                "rounded-md border px-2 py-0.5",
                overlays[k] ? "border-accent/50 bg-accent/10 text-accent" : "border-border text-muted",
              )}
            >
              {label}
            </button>
          ))}
          {data && <Badge tone={data.live ? "bull" : "hold"}>{data.live ? "live" : "mock"}</Badge>}
        </div>
      </div>
      <div className="relative h-[460px] sm:h-[560px]">
        {isLoading && <Skeleton className="absolute inset-3" />}
        {isError && <p className="p-4 text-sm text-bear">Grafiek laden mislukt: {(error as Error).message}</p>}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      <div className="flex gap-4 border-t border-border px-3 py-1.5 text-[11px] text-muted">
        <span>Paneel 1: prijs & volume</span>
        <span>Paneel 2: RSI (14)</span>
        <span>Paneel 3: MACD (12, 26, 9)</span>
      </div>
      {overlays.forecast && forecast && (
        <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted">
          {daily ? (
            <>
              <span className="font-semibold text-accent">- - Verwacht</span> = middenscenario; de dunne lijnen tonen waar de koers
              vroeger in 50% en 80% van de vergelijkbare gevallen bleef. Geen garantie.
            </>
          ) : (
            <>De voorspelling is te zien bij 1D en 1Y.</>
          )}
        </p>
      )}
    </Card>
  );
}
