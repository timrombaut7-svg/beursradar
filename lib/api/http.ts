/**
 * Kleine HTTP-laag met:
 *  - timeout
 *  - in-memory TTL-cache (per serverproces) om rate limits van gratis tiers te sparen
 *  - circuit breaker: na een 429/5xx wordt een host een tijdje overgeslagen
 */

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const hostCooldown = new Map<string, number>();

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export function mockMode(): boolean {
  return process.env.USE_MOCK_DATA === "1" || process.env.USE_MOCK_DATA === "true";
}

/**
 * Memoize een async functie op `key` met een TTL in seconden. Gelijktijdige
 * aanroepen met dezelfde key delen één request.
 */
export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const p = fn()
    .then((value) => {
      cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
      if (cache.size > 2000) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function isHostCoolingDown(url: string): boolean {
  const host = new URL(url).host;
  return (hostCooldown.get(host) ?? 0) > Date.now();
}

export function coolDownHost(url: string, seconds: number) {
  hostCooldown.set(new URL(url).host, Date.now() + seconds * 1000);
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const res = await fetchRaw(url, init);
  return (await res.json()) as T;
}

export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<string> {
  const res = await fetchRaw(url, init);
  return res.text();
}

async function fetchRaw(url: string, init: RequestInit & { timeoutMs?: number }) {
  if (mockMode()) throw new ApiError("mock mode actief");
  if (isHostCoolingDown(url)) throw new ApiError(`host in cooldown: ${new URL(url).host}`, 429);
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Beursradar/1.0)",
        Accept: "application/json, text/xml, */*",
        ...(rest.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500 || res.status === 451 || res.status === 403) {
        coolDownHost(url, res.status === 429 ? 60 : 300);
      }
      throw new ApiError(`HTTP ${res.status} voor ${url}`, res.status);
    }
    return res;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    coolDownHost(url, 60);
    throw new ApiError(`Netwerkfout voor ${url}: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probeert een reeks async bronnen op volgorde en geeft het eerste succesvolle
 * resultaat terug, of het resultaat van `fallback` als alles faalt.
 */
export async function withFallback<T>(
  attempts: (() => Promise<T>)[],
  fallback: () => T | Promise<T>,
  label = "bron",
): Promise<T> {
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (err) {
      if (process.env.NODE_ENV !== "test" && !mockMode()) {
        console.warn(`[beursradar] ${label} faalde, volgende bron:`, (err as Error).message);
      }
    }
  }
  return fallback();
}
