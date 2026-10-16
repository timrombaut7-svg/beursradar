"use client";
import { useMemo } from "react";
import type { SellAdvice, SignalRow } from "@/types";
import type { Position } from "@/lib/store/portfolio";
import { useSignals } from "@/lib/hooks";
import { sellAdvice } from "@/lib/engine/sellAdvice";

export interface PositionWithAdvice {
  position: Position;
  signal: SignalRow | undefined;
  price: number | undefined;
  advice: SellAdvice | undefined;
}

/** Actueel verkoopadvies per positie, op basis van het tradeplan en het huidige signaal. */
export function usePositionAdvice(positions: Position[]) {
  const query = useSignals(positions.map((p) => ({ symbol: p.symbol, type: p.type })));
  const rows = useMemo<PositionWithAdvice[]>(
    () =>
      positions.map((position) => {
        const signal = query.data?.find((s) => s.symbol === position.symbol && s.type === position.type);
        const price = signal?.price;
        return {
          position,
          signal,
          price,
          advice: price !== undefined ? sellAdvice(position, price, signal ? signal.shortTerm : null) : undefined,
        };
      }),
    [positions, query.data],
  );
  return { rows, isLoading: query.isLoading, isError: query.isError };
}
