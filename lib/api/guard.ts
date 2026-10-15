import type { AssetType } from "@/types";
import { mockMode } from "./http";
import { findInUniverse } from "./universe";

export class AssetNotFoundError extends Error {
  constructor(symbol: string) {
    super(`Geen koersdata gevonden voor ${symbol}: onbekend symbool of databronnen tijdelijk niet bereikbaar.`);
  }
}

/**
 * Mock-fallback is alleen verantwoord voor assets uit de catalogus. Voor een
 * onbekend symbool zonder live data verzinnen we geen analyse.
 */
export function assertResolvable(symbol: string, type: AssetType, live: boolean) {
  if (!live && !mockMode() && !findInUniverse(symbol, type)) throw new AssetNotFoundError(symbol);
}
