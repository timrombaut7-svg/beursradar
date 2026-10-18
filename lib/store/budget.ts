"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Horizon } from "@/types";
import type { RiskProfile } from "@/lib/engine/allocate";

interface BudgetState {
  amount: number;
  risk: RiskProfile;
  horizon: Horizon;
  set: (patch: Partial<Pick<BudgetState, "amount" | "risk" | "horizon">>) => void;
}

/** Laatst ingevulde budget en keuzes, bewaard op dit toestel. */
export const useBudget = create<BudgetState>()(
  persist(
    (set) => ({
      amount: 1000,
      risk: "balanced",
      horizon: "long",
      set: (patch) => set(patch),
    }),
    { name: "beursradar-budget", version: 1 },
  ),
);
