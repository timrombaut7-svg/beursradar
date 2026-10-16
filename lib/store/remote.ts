"use client";

/**
 * Doorgeefluik van store-mutaties naar de API. Actief zodra de server-sync
 * heeft vastgesteld dat er een database is; anders blijft alles lokaal.
 */
let enabled = false;
let onError: (() => void) | null = null;

export const remote = {
  enable(errorHandler: () => void) {
    enabled = true;
    onError = errorHandler;
  },
  disable() {
    enabled = false;
    onError = null;
  },
  isEnabled: () => enabled,
  async send(method: "POST" | "DELETE", url: string, body?: unknown) {
    if (!enabled) return;
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn("[beursradar] synchronisatie mislukt, herladen vanaf server:", err);
      onError?.();
    }
  },
};
