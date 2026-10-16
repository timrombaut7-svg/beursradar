import type { SellAction } from "@/types";
import { Badge } from "@/components/ui/badge";

const META: Record<SellAction, { tone: "bear" | "hold" | "bull"; label: string }> = {
  SELL: { tone: "bear", label: "Verkopen" },
  TAKE_PROFIT: { tone: "hold", label: "Deels winst nemen" },
  HOLD: { tone: "bull", label: "Houden" },
};

export function SellAdviceBadge({ action }: { action: SellAction }) {
  const m = META[action];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
