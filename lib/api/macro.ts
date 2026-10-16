import type { MacroData } from "@/types";
import { cached, fetchJson, fetchText, mockMode, withFallback } from "./http";
import { mockMacro } from "./mock";
import { getBtcDominance } from "./crypto";

const FRED = "https://api.stlouisfed.org/fred/series/observations";
const FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv";

/** Laatste `limit` waarden van een FRED-reeks, nieuwste eerst. */
async function fredSeries(id: string, limit: number): Promise<number[]> {
  const key = process.env.FRED_API_KEY;
  if (key) {
    const res = await fetchJson<{ observations: { value: string }[] }>(
      `${FRED}?series_id=${id}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`,
    );
    return res.observations.map((o) => parseFloat(o.value)).filter((v) => Number.isFinite(v));
  }
  // Zonder sleutel: de openbare CSV-download van FRED (oudste eerst, "." = ontbrekend)
  // FRED weigert browser-achtige User-Agents van servers; een eerlijke naam wordt wel toegelaten
  const csv = await fetchText(`${FRED_CSV}?id=${id}`, {
    timeoutMs: 10000,
    headers: { "User-Agent": "Beursradar/1.0 (+https://beursradar.vercel.app)", Accept: "text/csv" },
  });
  const values = parseFredCsv(csv);
  if (values.length < limit) throw new Error(`te weinig FRED-data voor ${id}`);
  return values.slice(-limit).reverse();
}

export function parseFredCsv(csv: string): number[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => parseFloat(line.split(",")[1]))
    .filter((v) => Number.isFinite(v));
}

function trend(latest: number, previous: number, eps = 0.05): MacroData["rateTrend"] {
  if (latest - previous > eps) return "rising";
  if (previous - latest > eps) return "falling";
  return "stable";
}

type FredPart = Pick<MacroData, "fedFundsRate" | "rateTrend" | "inflationYoY" | "inflationTrend" | "us10y">;

/** Rente en inflatie uit FRED; gooit een fout als de verplichte reeksen niet lukken. */
async function fredMacro(): Promise<FredPart> {
  // Na elkaar, verplichte reeksen eerst: een tijdelijke fout bij FRED zet de host even in de wacht
  const ff = await fredSeries("FEDFUNDS", 4);
  const cpi = await fredSeries("CPIAUCSL", 16);
  const dgs10 = await fredSeries("DGS10", 5).catch(() => [] as number[]);
  const yoy = (cpi[0] / cpi[12] - 1) * 100;
  const yoyPrev = (cpi[3] / cpi[15] - 1) * 100;
  return {
    fedFundsRate: ff[0],
    rateTrend: trend(ff[0], ff[3]),
    inflationYoY: Math.round(yoy * 100) / 100,
    inflationTrend: trend(yoy, yoyPrev, 0.15),
    us10y: dgs10[0] ?? null,
  };
}

/** Macro-omgeving: rente & inflatie via FRED (API met sleutel, anders de openbare CSV), BTC-dominantie via CoinGecko. */
export async function getMacro(): Promise<MacroData> {
  // Het geheel 2 minuten; echte FRED-data 6 uur (verandert maandelijks). Een mislukte poging
  // wordt niet bewaard, zodat de app binnen enkele minuten weer echte cijfers probeert.
  return cached("macro", 120, async () => {
    const base = mockMacro();
    const fred = await cached("macro:fred", 6 * 3600, fredMacro).catch((err) => {
      console.warn("[beursradar] FRED macro faalde:", (err as Error).message);
      return null;
    });
    const dominance = await withFallback([() => getBtcDominance()], () => null as number | null, "BTC dominance");
    // Geen live dominantie → geen getal (behalve in demo-modus), zodat er nooit een verzonnen waarde meetelt
    const btcDominance = dominance ?? (mockMode() ? base.btcDominance : null);
    // Bron weerspiegelt rente/inflatie (de kern van de macro-pijler); zonder FRED zijn dat
    // indicatieve waarden die niet meetellen in de score, ook als de BTC-dominantie wel live is.
    const f = fred ?? base;
    return {
      fedFundsRate: f.fedFundsRate,
      rateTrend: f.rateTrend,
      inflationYoY: f.inflationYoY,
      inflationTrend: f.inflationTrend,
      us10y: f.us10y,
      btcDominance,
      btcDominanceTrend: base.btcDominanceTrend,
      source: fred ? "live" : "mock",
    };
  });
}
