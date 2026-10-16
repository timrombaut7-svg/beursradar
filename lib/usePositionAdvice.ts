"use client";
import { useMemo } from "react";
import type { SellAdvice, SignalRow } from "@/types";
import type { Position } from "@/lib/store/portfolio";
import { useLivePrices, useSignals } from "@/lib/hooks";
import { sellAdvice } from "@/lib/engine/sellAdvice";

export interface PositionWithAdvice {
  position: Position;
  signal: SignalRow | undefined;
  price: number | undefined;
  advice: SellAdvice | undefined;
}

/** Actueel verkoopadvies per positie, op basis van het tradeplan en het huidige signaal. */
export function usePositionAdvice(positions: Position[]) {
  const assets = positions.map((p) => ({ symbol: p.symbol, type: p.type }));
  const query = useSignals(assets);
  // Live koers (elke 15 s) gaat vóór de koers uit het signaal (elke minuut)
  const live = useLivePrices(assets);
  const rows = useMemo<PositionWithAdvice[]>(
    () =>
      positions.map((position) => {
        const signal = query.data?.find((s) => s.symbol === position.symbol && s.type === position.type);
        const lp = live.data?.prices.find((x) => x.symbol === position.symbol && x.type === position.type);
        const price = lp?.price ?? signal?.price;
        return {
          position,
          signal,
          price,
          // Lange-termijnposities volgen het lange-termijnsignaal, korte het korte
          advice:
            price !== undefined
              ? sellAdvice(position, price, signal ? (position.horizon === "long" ? signal.longTerm : signal.shortTerm) : null)
              : undefined,
        };
      }),
    [positions, query.data, live.data],
  );
  return { rows, isLoading: query.isLoading, isError: query.isError };
}
