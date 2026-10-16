import { ShieldCheck } from "lucide-react";
import type { Evidence, Horizon } from "@/types";
import { evidenceSentence } from "@/lib/evidenceText";

/** Het bewijs achter een tip: hoe deed hetzelfde signaal het in het verleden? */
export function EvidenceBox({ evidence, horizon }: { evidence: Evidence; horizon: Horizon }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-bull/30 bg-bull/5 p-3 text-sm">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-bull" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-bull">Getest op het verleden</p>
        <p className="mt-0.5 leading-relaxed">{evidenceSentence(evidence, horizon)}</p>
      </div>
    </div>
  );
}
