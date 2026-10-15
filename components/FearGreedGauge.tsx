"use client";
import { Pie, PieChart, Cell } from "recharts";
import type { FearGreed } from "@/types";
import { Badge } from "./ui/badge";

const SEGMENTS = [
  { name: "Extreme Fear", value: 25, color: "#ef4444" },
  { name: "Fear", value: 20, color: "#f97316" },
  { name: "Neutral", value: 10, color: "#f59e0b" },
  { name: "Greed", value: 20, color: "#84cc16" },
  { name: "Extreme Greed", value: 25, color: "#10b981" },
];

const LABEL_NL: Record<string, string> = {
  "Extreme Fear": "Extreme angst",
  Fear: "Angst",
  Neutral: "Neutraal",
  Greed: "Hebzucht",
  "Extreme Greed": "Extreme hebzucht",
};

/** Halve dial-gauge (0 = extreme angst, 100 = extreme hebzucht). */
export function FearGreedGauge({ data, title }: { data: FearGreed; title: string }) {
  const angle = -90 + (Math.max(0, Math.min(100, data.value)) / 100) * 180;
  const color = SEGMENTS.find((_, i) => data.value <= [25, 45, 55, 75, 100][i])?.color ?? "#f59e0b";
  return (
    <div className="flex flex-col items-center">
      <div className="mb-1 flex w-full items-center justify-between">
        <span className="text-xs font-medium text-muted">{title}</span>
        <Badge tone={data.source === "mock" ? "hold" : "bull"}>{data.source}</Badge>
      </div>
      {/* Vaste geometrie: boog-straal 95px, naald 78px vanaf het middelpunt (100, 100) */}
      <div className="relative h-[106px] w-[200px]" role="img" aria-label={`Fear & Greed ${data.value}`}>
        <PieChart width={200} height={106}>
          <Pie
            data={SEGMENTS}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            cx={100}
            cy={100}
            innerRadius={68}
            outerRadius={95}
            stroke="none"
            isAnimationActive={false}
          >
            {SEGMENTS.map((s) => (
              <Cell key={s.name} fill={s.color} fillOpacity={0.85} />
            ))}
          </Pie>
        </PieChart>
        <div
          className="absolute left-[98.5px] top-[22px] h-[78px] w-[3px] origin-bottom rounded-full bg-text transition-transform duration-700"
          style={{ transform: `rotate(${angle}deg)` }}
          aria-hidden
        />
        <div className="absolute left-[94px] top-[94px] h-3 w-3 rounded-full bg-text" />
      </div>
      <div className="mt-3 text-center">
        <div className="font-mono text-3xl font-bold tabular" style={{ color }}>
          {data.value}
        </div>
        <div className="text-sm font-medium">{LABEL_NL[data.label] ?? data.label}</div>
        <div className="mt-1 flex gap-3 text-[11px] text-muted">
          {data.previousClose !== undefined && <span>Gisteren: {data.previousClose}</span>}
          {data.weekAgo !== undefined && <span>Week geleden: {data.weekAgo}</span>}
        </div>
      </div>
    </div>
  );
}
