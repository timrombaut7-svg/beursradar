"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetType } from "@/types";
import { remote } from "./remote";

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
  /** Vervangt de lijst door de server-versie (zonder terug te synchroniseren). */
  replace: (items: WatchItem[]) => void;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [
        { symbol: "BTC", name: "Bitcoin", type: "crypto", addedAt: 0 },
        { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock", addedAt: 0 },
        { symbol: "ASML", name: "ASML Holding N.V.", type: "stock", addedAt: 0 },
      ],
      toggle: (item) => {
        if (get().has(item.symbol, item.type)) return get().remove(item.symbol, item.type);
        set((s) => ({ items: [...s.items, { ...item, addedAt: Date.now() }] }));
        void remote.send("POST", "/api/watchlist", item);
      },
      remove: (symbol, type) => {
        set((s) => ({ items: s.items.filter((i) => !(i.symbol === symbol && i.type === type)) }));
        void remote.send("DELETE", `/api/watchlist?type=${type}&symbol=${encodeURIComponent(symbol)}`);
      },
      replace: (items) => set({ items }),
      has: (symbol, type) => get().items.some((i) => i.symbol === symbol && i.type === type),
    }),
    { name: "beursradar-watchlist", version: 1 },
  ),
);
