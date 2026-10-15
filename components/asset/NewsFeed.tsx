import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";

const LABEL = { bullish: "Bullish", bearish: "Bearish", neutral: "Neutraal" } as const;
const TONE = { bullish: "bull", bearish: "bear", neutral: "hold" } as const;

export function NewsFeed({ items }: { items: NewsItem[] }) {
  if (!items.length) return <p className="text-sm text-muted">Geen nieuws gevonden.</p>;
  return (
    <ul className="max-h-[520px] space-y-2 overflow-auto pr-1">
      {items.map((n) => (
        <li key={n.id} className="rounded-lg border border-border bg-panel-2/50 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
            <Badge tone={TONE[n.sentiment]}>{LABEL[n.sentiment]}</Badge>
            <span className="font-mono">{n.sentimentScore > 0 ? "+" : ""}{n.sentimentScore.toFixed(2)}</span>
            <span>·</span>
            <span className="truncate">{n.publisher}</span>
            <span>·</span>
            <span className="shrink-0">{timeAgo(n.publishedAt)}</span>
            {n.source === "mock" && <Badge tone="hold">mock</Badge>}
          </div>
          {n.url && n.url !== "#" ? (
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-1 text-sm font-medium hover:text-accent">
              {n.title}
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
            </a>
          ) : (
            <p className="text-sm font-medium">{n.title}</p>
          )}
          {n.summary && <p className="mt-1 line-clamp-2 text-xs text-muted">{n.summary}</p>}
        </li>
      ))}
    </ul>
  );
}
