import type { Advice } from "@/types";

export function formatPrice(v: number | null | undefined, currency = "USD"): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const digits = Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? 2 : Math.abs(v) >= 0.01 ? 4 : 8;
  try {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(v);
  } catch {
    return v.toFixed(digits);
  }
}

export function formatNumber(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
}

export function formatCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("nl-NL", { notation: "compact", maximumFractionDigits: 2 }).format(v);
}

/** Fractie → percentage-string (0.123 → "12,30%") */
export function formatPct(v: number | null | undefined, digits = 2, signed = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  // Afgerond nul is gewoon nul: geen "-0,0%" of "+0,0%"
  if (Number((v * 100).toFixed(digits)) === 0) v = 0;
  const s = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v * 100);
  return `${signed && v > 0 ? "+" : ""}${s}%`;
}

export function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "zojuist";
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`;
  return `${Math.floor(diff / 86400)} d geleden`;
}

export const ADVICE_META: Record<Advice, { nl: string; en: string; tone: "bull" | "bear" | "hold"; strong: boolean }> = {
  STRONG_BUY: { nl: "STERK KOOP", en: "Strong Buy", tone: "bull", strong: true },
  BUY: { nl: "KOOP", en: "Buy", tone: "bull", strong: false },
  HOLD: { nl: "HOUDEN", en: "Hold", tone: "hold", strong: false },
  SELL: { nl: "VERKOOP", en: "Sell", tone: "bear", strong: false },
  STRONG_SELL: { nl: "STERK VERKOOP", en: "Strong Sell", tone: "bear", strong: true },
};

export function toneOf(v: number, neutralBand = 0): "bull" | "bear" | "hold" {
  if (v > neutralBand) return "bull";
  if (v < -neutralBand) return "bear";
  return "hold";
}

export const TONE_TEXT = { bull: "text-bull", bear: "text-bear", hold: "text-hold" } as const;
export const TONE_BG = { bull: "bg-bull/15", bear: "bg-bear/15", hold: "bg-hold/15" } as const;
export const TONE_BORDER = { bull: "border-bull/40", bear: "border-bear/40", hold: "border-hold/40" } as const;
