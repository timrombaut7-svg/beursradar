"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { findTerm, type GlossaryTerm } from "@/lib/glossary";
import { cn } from "@/lib/utils";

const WIDTH = 272;

/**
 * Een label met uitleg: staat het woord in de woordenlijst, dan krijgt het een stippellijn
 * en opent een tik (of klik) een korte uitleg met een link naar de volledige woordenlijst.
 */
export function TermLabel({ label, term, className }: { label: string; term?: GlossaryTerm | null; className?: string }) {
  const t = term === undefined ? findTerm(label) : term;
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e.type === "pointerdown" && (bubble.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setPos(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", esc);
    };
  }, [pos]);

  if (!t) return <span className={className}>{label}</span>;

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), window.innerWidth - WIDTH - 8);
    // Onder het woord, of erboven als er onderaan geen ruimte is
    const top = r.bottom + 180 > window.innerHeight ? Math.max(8, r.top - 186) : r.bottom + 6;
    setPos({ left, top });
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-expanded={!!pos}
        title={t.short}
        className={cn("cursor-help text-left underline decoration-muted/60 decoration-dotted underline-offset-2 hover:text-text", className)}
      >
        {label}
      </button>
      {pos && (
        <div
          ref={bubble}
          role="dialog"
          aria-label={t.term}
          style={{ left: pos.left, top: pos.top, width: WIDTH }}
          className="fixed z-50 space-y-1.5 rounded-xl border border-border bg-panel p-3 text-left text-xs normal-case tracking-normal text-text shadow-xl"
        >
          <div className="text-sm font-semibold">{t.term}</div>
          <p className="leading-relaxed text-muted">{t.short}</p>
          {t.tip && <p className="leading-relaxed">💡 {t.tip}</p>}
          <Link href={`/uitleg#${t.id}`} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
            <BookOpen className="h-3.5 w-3.5" /> Alle woorden
          </Link>
        </div>
      )}
    </>
  );
}
