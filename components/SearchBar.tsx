"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bitcoin, Building2, Loader2, Search } from "lucide-react";
import { useSearch } from "@/lib/hooks";
import type { SearchResult } from "@/types";
import { cn } from "@/lib/utils";

export function assetHref(r: Pick<SearchResult, "type" | "symbol">) {
  return `/asset/${r.type}/${encodeURIComponent(r.symbol)}`;
}

export function SearchBar({ autoFocus = false, large = false }: { autoFocus?: boolean; large?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  // Sneltoets: "/" focust de zoekbalk
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const { data: results = [], isFetching } = useSearch(debounced);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    router.push(assetHref(r));
  };

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-xl">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-panel px-3 focus-within:border-accent/60",
          large ? "h-12" : "h-9",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            else if (e.key === "Enter" && results[active]) go(results[active]);
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Zoek aandeel, ETF of crypto… (NVDA, VWRL, BTC)"
          className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted"
          aria-label="Zoek asset"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-results"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        {!large && (
          <kbd className="hidden rounded border border-border px-1.5 text-[10px] text-muted sm:block">/</kbd>
        )}
      </div>
      <AnimatePresence>
        {open && debounced && (
          <motion.ul
            id="search-results"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded-lg border border-border bg-panel p-1 shadow-2xl"
          >
            {results.length === 0 && !isFetching && <li className="px-3 py-2 text-sm text-muted">Geen resultaten</li>}
            {results.map((r, i) => (
              <li key={`${r.type}:${r.symbol}`} role="option" aria-selected={i === active}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm",
                    i === active ? "bg-panel-2" : "hover:bg-panel-2",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                      r.type === "crypto" ? "bg-hold/15 text-hold" : "bg-accent/15 text-accent",
                    )}
                  >
                    {r.type === "crypto" ? <Bitcoin className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-mono font-semibold">{r.symbol}</span>
                    <span className="ml-2 truncate text-muted">{r.name}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">{r.exchange}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
