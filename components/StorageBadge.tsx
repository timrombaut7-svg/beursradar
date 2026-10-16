"use client";
import { Database, HardDrive } from "lucide-react";
import { useStorageMode } from "@/lib/store/sync";

/** Laat zien waar watchlist/portfolio worden opgeslagen. */
export function StorageLabel() {
  const mode = useStorageMode((s) => s.mode);
  if (mode === "pending") return <span>laden…</span>;
  return mode === "database" ? (
    <span className="inline-flex items-center gap-1">
      <Database className="h-3 w-3" /> opgeslagen in de database
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <HardDrive className="h-3 w-3" /> opgeslagen in je browser
    </span>
  );
}
