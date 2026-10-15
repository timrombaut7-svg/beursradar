"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetType } from "@/types";

export interface Position {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  buyPrice: number;
  buyDate: string; // ISO datum
  currency: string;
}

interface PortfolioState {
  positions: Position[];
  add: (p: Omit<Position, "id">) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set) => ({
      positions: [],
      add: (p) =>
        set((s) => ({ positions: [...s.positions, { ...p, id: `${p.symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }] })),
      remove: (id) => set((s) => ({ positions: s.positions.filter((p) => p.id !== id) })),
      clear: () => set({ positions: [] }),
    }),
    { name: "beursradar-portfolio", version: 1 },
  ),
);

/** Pure PnL-berekening, los testbaar van de store. */
export function positionPnl(p: Pick<Position, "quantity" | "buyPrice">, currentPrice: number) {
  const cost = p.quantity * p.buyPrice;
  const value = p.quantity * currentPrice;
  return { cost, value, pnl: value - cost, pnlPct: cost > 0 ? value / cost - 1 : 0 };
}
