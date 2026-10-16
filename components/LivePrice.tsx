"use client";
import { useState } from "react";
import type { MarketState } from "@/types";
import { formatPct, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Koers die kort oplicht (groen/rood) als hij verandert. */
export function LivePriceValue({ price, currency, changePct, className }: { price: number; currency: string; changePct?: number; className?: string }) {
  const [prev, setPrev] = useState(price);
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  if (price !== prev) {
    setDir(price > prev ? 1 : -1);
    setPrev(price);
  }
  return (
    <span className={cn("font-mono tabular", className)}>
      <span key={price} className={cn("rounded px-0.5", dir > 0 && "flash-up", dir < 0 && "flash-down")}>
        {formatPrice(price, currency)}
      </span>{" "}
      {changePct !== undefined && (
        <span className={changePct >= 0 ? "text-bull" : "text-bear"}>{formatPct(changePct / 100, 2, true)}</span>
      )}
    </span>
  );
}

const STATE: Record<MarketState, { label: string; cls: string }> = {
  open: { label: "beurs open", cls: "text-bull" },
  pre: { label: "voorbeurs", cls: "text-hold" },
  post: { label: "nabeurs", cls: "text-hold" },
  closed: { label: "beurs gesloten", cls: "text-muted" },
  "24/7": { label: "24/7", cls: "text-bull" },
};

export function MarketStateTag({ state }: { state: MarketState }) {
  const s = STATE[state];
  return <span className={cn("text-[10px] uppercase tracking-wide", s.cls)}>{s.label}</span>;
}

/** Pulserend "live"-bolletje. */
export function LiveDot({ active = true }: { active?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2" aria-hidden>
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-60" />}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", active ? "bg-bull" : "bg-muted")} />
    </span>
  );
}
