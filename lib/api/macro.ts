import type { MacroData } from "@/types";
import { cached, fetchJson, withFallback } from "./http";
import { mockMacro } from "./mock";
import { getBtcDominance } from "./crypto";

const FRED = "https://api.stlouisfed.org/fred/series/observations";

async function fredSeries(id: string, limit: number): Promise<number[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("geen FRED_API_KEY");
  const res = await fetchJson<{ observations: { value: string }[] }>(
    `${FRED}?series_id=${id}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`,
  );
  return res.observations.map((o) => parseFloat(o.value)).filter((v) => Number.isFinite(v));
}

function trend(latest: number, previous: number, eps = 0.05): MacroData["rateTrend"] {
  if (latest - previous > eps) return "rising";
  if (previous - latest > eps) return "falling";
  return "stable";
}

/** Macro-omgeving: rente & inflatie via FRED (optioneel), BTC-dominantie via CoinGecko. */
export async function getMacro(): Promise<MacroData> {
  return cached("macro", 3600, async () => {
    const base = mockMacro();
    type FredPart = Pick<MacroData, "fedFundsRate" | "rateTrend" | "inflationYoY" | "inflationTrend" | "us10y"> & { live: boolean };
    const fred = await withFallback<FredPart>(
      [
        async () => {
          const [ff, cpi, dgs10] = await Promise.all([
            fredSeries("FEDFUNDS", 4),
            fredSeries("CPIAUCSL", 16),
            fredSeries("DGS10", 5),
          ]);
          const yoy = (cpi[0] / cpi[12] - 1) * 100;
          const yoyPrev = (cpi[3] / cpi[15] - 1) * 100;
          return {
            fedFundsRate: ff[0],
            rateTrend: trend(ff[0], ff[3]),
            inflationYoY: Math.round(yoy * 100) / 100,
            inflationTrend: trend(yoy, yoyPrev, 0.15),
            us10y: dgs10[0],
            live: true,
          };
        },
      ],
      () => ({ ...base, live: false }),
      "FRED macro",
    );
    const dominance = await withFallback([() => getBtcDominance()], () => null as number | null, "BTC dominance");
    // Bron weerspiegelt rente/inflatie (de kern van de macro-pijler); zonder FRED_API_KEY
    // zijn dat indicatieve waarden, ook als de BTC-dominantie wel live is.
    return {
      fedFundsRate: fred.fedFundsRate,
      rateTrend: fred.rateTrend,
      inflationYoY: fred.inflationYoY,
      inflationTrend: fred.inflationTrend,
      us10y: fred.us10y,
      btcDominance: dominance ?? base.btcDominance,
      btcDominanceTrend: base.btcDominanceTrend,
      source: fred.live ? "live" : "mock",
    };
  });
}
