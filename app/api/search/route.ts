import { NextResponse, type NextRequest } from "next/server";
import { searchUniverse } from "@/lib/api/universe";
import { searchStocks } from "@/lib/api/stocks";
import { searchCrypto } from "@/lib/api/crypto";
import type { SearchResult } from "@/types";

/** Zoekt eerst lokaal (instant), vult aan met Yahoo + CoinGecko (met korte timeout). */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 1) return NextResponse.json({ results: [] });

  const local = searchUniverse(q, 8);
  const withTimeout = <T,>(p: Promise<T>, ms = 2500) =>
    Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

  const remote = q.length >= 2
    ? await Promise.allSettled([withTimeout(searchStocks(q)), withTimeout(searchCrypto(q))])
    : [];
  const remoteResults = remote.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const r of [...local, ...remoteResults]) {
    const key = `${r.type}:${r.symbol.toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(r);
  }
  return NextResponse.json(
    { results: results.slice(0, 12) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
