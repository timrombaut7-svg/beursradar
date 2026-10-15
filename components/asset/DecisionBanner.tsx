"use client";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus, ShieldCheck } from "lucide-react";
import type { Analysis, HorizonVerdict, Pillar } from "@/types";
import { ADVICE_META, TONE_BG, TONE_BORDER, TONE_TEXT, toneOf } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const PILLAR_NL: Record<Pillar, string> = {
  fundamental: "Fundamenteel",
  technical: "Technisch",
  sentiment: "Sentiment & Macro",
  risk: "Risico",
};

const PILLAR_SHORT: Record<Pillar, string> = {
  fundamental: "Fundamenteel",
  technical: "Technisch",
  sentiment: "Sentiment",
  risk: "Risico",
};

function ScoreBar({ score }: { score: number }) {
  // -100..100 → 0..100% met het midden op 50%
  const pos = (score + 100) / 2;
  return (
    <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-bear/70 via-hold/70 to-bull/70">
      <motion.div
        initial={{ left: "50%" }}
        animate={{ left: `${pos}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-text shadow"
      />
    </div>
  );
}

function VerdictCard({ v, title, subtitle }: { v: HorizonVerdict; title: string; subtitle: string }) {
  const meta = ADVICE_META[v.advice];
  const Icon = meta.tone === "bull" ? TrendingUp : meta.tone === "bear" ? TrendingDown : Minus;
  return (
    <div className={cn("rounded-xl border p-4", TONE_BORDER[meta.tone], TONE_BG[meta.tone])}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{title}</p>
          <p className="text-[11px] text-muted">{subtitle}</p>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted" title="Betrouwbaarheid: eensgezindheid pijlers × signaalsterkte × datakwaliteit">
          <ShieldCheck className="h-3.5 w-3.5" />
          {v.confidence}%
        </span>
      </div>
      <div className={cn("mt-2 flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl", TONE_TEXT[meta.tone])}>
        <Icon className="h-7 w-7" />
        {meta.nl}
      </div>
      <p className="text-xs text-muted">({meta.en})</p>
      <div className="mt-4 flex items-center gap-3">
        <ScoreBar score={v.score} />
        <span className={cn("w-12 text-right font-mono text-sm font-bold tabular", TONE_TEXT[toneOf(v.score, 14)])}>
          {v.score > 0 ? "+" : ""}
          {v.score}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-y-1 text-xs">
        {(Object.keys(v.pillarScores) as Pillar[]).map((p) => (
          <div key={p} className="flex items-center justify-between gap-2">
            <span className="text-muted">
              {PILLAR_SHORT[p]} <span className="text-[10px] opacity-70">· weging {Math.round(v.weights[p] * 100)}%</span>
            </span>
            <span className={cn("font-mono tabular", TONE_TEXT[toneOf(v.pillarScores[p], 10)])}>
              {v.pillarScores[p] > 0 ? "+" : ""}
              {v.pillarScores[p]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecisionBanner({ a }: { a: Analysis }) {
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">AI Trading Signaal</h2>
        <span className="text-[11px] text-muted">Score: -100 (extreem bearish) … +100 (extreem bullish)</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <VerdictCard v={a.shortTerm} title="Korte termijn" subtitle="Swing trade · 1–4 weken" />
        <VerdictCard v={a.longTerm} title="Lange termijn" subtitle="Investering · 1–5 jaar" />
      </div>
    </Card>
  );
}
