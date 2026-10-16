"use client";
import { useState } from "react";
import { ChevronDown, ThumbsUp, TriangleAlert } from "lucide-react";
import type { SignalExplanation } from "@/types";
import { cn } from "@/lib/utils";

export function Explanation({ explanation, defaultOpen = false }: { explanation: SignalExplanation; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { summary, pros, cons } = explanation;
  return (
    <div className="mt-2 text-sm">
      <p className="leading-relaxed text-text/90">{summary}</p>
      {(pros.length > 0 || cons.length > 0) && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          aria-expanded={open}
        >
          {open ? "Minder uitleg" : "Waarom? Bekijk de argumenten"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      )}
      {open && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {pros.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-bull">
                <ThumbsUp className="h-3.5 w-3.5" /> Waarom kopen
              </p>
              <ul className="space-y-1.5">
                {pros.map((p) => (
                  <li key={p.title} className="text-xs">
                    <span className="font-medium">{p.title}</span> <span className="font-mono text-muted">({p.value})</span>
                    <span className="block text-muted">{p.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-hold">
                <TriangleAlert className="h-3.5 w-3.5" /> Let op
              </p>
              <ul className="space-y-1.5">
                {cons.map((c) => (
                  <li key={c.title} className="text-xs">
                    <span className="font-medium">{c.title}</span> <span className="font-mono text-muted">({c.value})</span>
                    <span className="block text-muted">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
