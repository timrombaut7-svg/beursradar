"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetType } from "@/types";
import { remote } from "./remote";

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
  /** Vervangt alle posities door de server-versie (zonder terug te synchroniseren). */
  replace: (positions: Position[]) => void;
}

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set) => ({
      positions: [],
      add: (p) => {
        const position = { ...p, id: crypto.randomUUID() };
        set((s) => ({ positions: [...s.positions, position] }));
        void remote.send("POST", "/api/portfolio", position);
      },
      remove: (id) => {
        set((s) => ({ positions: s.positions.filter((p) => p.id !== id) }));
        void remote.send("DELETE", `/api/portfolio?id=${encodeURIComponent(id)}`);
      },
      clear: () => {
        set({ positions: [] });
        void remote.send("DELETE", "/api/portfolio?all=1");
      },
      replace: (positions) => set({ positions }),
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
