import type { DataSource } from "@/types";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";

export function DataSources({ sources, generatedAt }: { sources: Record<string, DataSource>; generatedAt: number }) {
  const anyMock = Object.values(sources).some((s) => s === "mock");
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
      <span>Databronnen:</span>
      {Object.entries(sources).map(([k, v]) => (
        <Badge key={k} tone={v === "mock" ? "hold" : v === "derived" ? "accent" : "bull"} title={v}>
          {k}: {v}
        </Badge>
      ))}
      <span className="ml-1">· bijgewerkt {timeAgo(generatedAt)}</span>
      {anyMock && <span className="w-full text-hold">Sommige API&apos;s waren niet bereikbaar of rate-limited — realistische mock-data wordt gebruikt.</span>}
    </div>
  );
}
