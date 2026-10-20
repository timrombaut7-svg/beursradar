"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORY_LABEL, GLOSSARY, searchGlossary, type GlossaryCategory, type GlossaryTerm } from "@/lib/glossary";
import { cn } from "@/lib/utils";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as GlossaryCategory[];

/** Andere namen die nog niet in de titel staan (max. 4) */
const aka = (t: GlossaryTerm) =>
  (t.aliases ?? []).filter((a) => a.length > 2 && !t.term.toLowerCase().includes(a.toLowerCase())).slice(0, 4);

export function Glossary() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<GlossaryCategory | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  // Via een link (/uitleg#rsi): naar dat woord scrollen en het even oplichten
  useEffect(() => {
    const show = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id || !GLOSSARY.some((t) => t.id === id)) return;
      setQ("");
      setCat(null);
      setFocus(id);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, []);

  const results = useMemo(() => searchGlossary(q, cat), [q, cat]);
  const grouped = CATEGORIES.map((c) => ({ c, items: results.filter((t) => t.category === c) })).filter((g) => g.items.length);

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 -mx-1 space-y-2 bg-bg/90 px-1 py-2 backdrop-blur">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-panel px-3 focus-within:border-accent/60">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek een woord… (RSI, stop-loss, ETF)"
            aria-label="Zoek in de woordenlijst"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Wis zoekopdracht" className="text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {[null, ...CATEGORIES].map((c) => (
            <button
              key={c ?? "alles"}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1",
                cat === c ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-muted hover:text-text",
              )}
            >
              {c ? CATEGORY_LABEL[c] : "Alles"}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 && <p className="py-8 text-center text-sm text-muted">Geen woord gevonden voor &ldquo;{q}&rdquo;.</p>}

      {grouped.map(({ c, items }) => (
        <section key={c} className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">{CATEGORY_LABEL[c]}</h2>
          <ul className="space-y-2">
            {items.map((t) => (
              <li
                key={t.id}
                id={t.id}
                className={cn(
                  "scroll-mt-40 rounded-2xl border bg-panel/80 p-4 transition-colors",
                  focus === t.id ? "border-accent/70 ring-2 ring-accent/30" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="font-semibold">{t.term}</h3>
                  {aka(t).length > 0 && <span className="text-[11px] text-muted">ook: {aka(t).join(", ")}</span>}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t.short}</p>
                {t.tip && <p className="mt-2 text-sm leading-relaxed">💡 {t.tip}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
