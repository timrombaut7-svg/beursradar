"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetType } from "@/types";

export interface WatchItem {
  symbol: string;
  name: string;
  type: AssetType;
  addedAt: number;
}

interface WatchlistState {
  items: WatchItem[];
  toggle: (item: Omit<WatchItem, "addedAt">) => void;
  remove: (symbol: string, type: AssetType) => void;
  has: (symbol: string, type: AssetType) => boolean;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [
        { symbol: "BTC", name: "Bitcoin", type: "crypto", addedAt: 0 },
        { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock", addedAt: 0 },
        { symbol: "ASML", name: "ASML Holding N.V.", type: "stock", addedAt: 0 },
      ],
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.symbol === item.symbol && i.type === item.type)
            ? { items: s.items.filter((i) => !(i.symbol === item.symbol && i.type === item.type)) }
            : { items: [...s.items, { ...item, addedAt: Date.now() }] },
        ),
      remove: (symbol, type) => set((s) => ({ items: s.items.filter((i) => !(i.symbol === symbol && i.type === type)) })),
      has: (symbol, type) => get().items.some((i) => i.symbol === symbol && i.type === type),
    }),
    { name: "beursradar-watchlist", version: 1 },
  ),
);
