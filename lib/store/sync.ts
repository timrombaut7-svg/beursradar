"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { remote } from "./remote";
import { useWatchlist, type WatchItem } from "./watchlist";
import { usePortfolio, type Position } from "./portfolio";

export type StorageMode = "pending" | "local" | "database";

export const useStorageMode = create<{ mode: StorageMode; set: (m: StorageMode) => void }>((set) => ({
  mode: "pending",
  set: (mode) => set({ mode }),
}));

const IMPORTED_FLAG = "beursradar-db-imported";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getJson<T>(url: string): Promise<{ status: number; body: T | null }> {
  const res = await fetch(url, { cache: "no-store" });
  return { status: res.status, body: res.ok ? ((await res.json()) as T) : null };
}

async function pull(): Promise<boolean> {
  const [w, p] = await Promise.all([
    getJson<{ items: WatchItem[] }>("/api/watchlist"),
    getJson<{ positions: Position[] }>("/api/portfolio"),
  ]);
  if (!w.body || !p.body) return false;
  useWatchlist.getState().replace(w.body.items);
  usePortfolio.getState().replace(p.body.positions);
  return true;
}

/** Bestaande LocalStorage-data eenmalig naar de database kopiëren. */
async function importLocalData() {
  const watchlist = useWatchlist.getState().items.map(({ symbol, name, type }) => ({ symbol, name, type }));
  // Posities van vóór de database hadden geen UUID; die krijgen er nu één
  const positions = usePortfolio.getState().positions.map((p) => ({ ...p, id: UUID_RE.test(p.id) ? p.id : crypto.randomUUID() }));
  if (watchlist.length + positions.length === 0) return;
  await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ watchlist, positions }),
  });
}

function storageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* privémodus: niet erg, import is idempotent aan serverkant */
  }
}

/**
 * Synchroniseert watchlist en portfolio met de database als die beschikbaar is.
 * Zonder database (API geeft 503) of offline blijft alles in LocalStorage werken.
 */
let started: Promise<void> | null = null;

async function startSync() {
  const setMode = useStorageMode.getState().set;
  try {
    // Eerste request is sequentieel: die maakt zo nodig het profiel + cookie aan
    const probe = await fetch("/api/watchlist", { cache: "no-store" });
    if (!probe.ok) return setMode("local");
    if (!storageGet(IMPORTED_FLAG)) {
      await importLocalData();
      storageSet(IMPORTED_FLAG, "1");
    }
    if (await pull()) {
      remote.enable(() => void pull());
      setMode("database");
    } else setMode("local");
  } catch {
    setMode("local");
  }
}

export function useServerSync() {
  useEffect(() => {
    // Eén keer per pagina-load, ook als React (StrictMode) het effect dubbel uitvoert
    started ??= startSync();
  }, []);
}
