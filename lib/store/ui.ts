"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Timeframe } from "@/types";

interface UiState {
  theme: "dark" | "light";
  timeframe: Timeframe;
  horizon: "short" | "long";
  overlays: { ema: boolean; bollinger: boolean; levels: boolean; forecast: boolean };
  setTheme: (t: "dark" | "light") => void;
  setTimeframe: (t: Timeframe) => void;
  setHorizon: (h: "short" | "long") => void;
  toggleOverlay: (k: keyof UiState["overlays"]) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      timeframe: "1D",
      horizon: "short",
      overlays: { ema: true, bollinger: false, levels: true, forecast: true },
      setTheme: (theme) => set({ theme }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setHorizon: (horizon) => set({ horizon }),
      toggleOverlay: (k) => set((s) => ({ overlays: { ...s.overlays, [k]: !s.overlays[k] } })),
    }),
    {
      name: "beursradar-ui",
      version: 2,
      // Versie 2: voorspelling in de grafiek, standaard aan
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<UiState>;
        if (version < 2 && s.overlays) s.overlays = { ...s.overlays, forecast: true };
        return s as UiState;
      },
    },
  ),
);
