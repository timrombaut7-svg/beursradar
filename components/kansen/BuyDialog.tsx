"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import type { SignalRow } from "@/types";
import { usePortfolio } from "@/lib/store/portfolio";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const input = "mt-1 h-9 w-full rounded-lg border border-border bg-panel-2 px-3 font-mono text-sm outline-none focus:border-accent/60";

/** "Gekocht"-knop: legt de positie vast mét het tradeplan van dit moment. */
export function BuyDialog({ row }: { row: SignalRow }) {
  const add = usePortfolio((s) => s.add);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [price, setPrice] = useState(() => String(roundPrice(row.price)));
  const p = Number(price.replace(",", "."));
  const a = Number(amount.replace(",", "."));
  const quantity = p > 0 && a > 0 ? a / p : 0;
  const plan = row.tradePlan;

  const confirm = () => {
    if (!(quantity > 0)) return;
    add({
      symbol: row.symbol,
      name: row.name,
      type: row.type,
      quantity: Number(quantity.toPrecision(8)),
      buyPrice: p,
      buyDate: new Date().toISOString().slice(0, 10),
      currency: row.currency,
      stopLoss: plan.stopLoss,
      target1: plan.target1,
      target2: plan.target2,
    });
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="bull">
          <Check className="h-4 w-4" /> Gekocht
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-panel p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-semibold">{row.symbol} gekocht</Dialog.Title>
              <Dialog.Description className="text-xs text-muted">
                Leg je aankoop vast. Beursradar volgt daarna de stop-loss en koersdoelen en zegt wanneer je moet verkopen.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-muted hover:text-text" aria-label="Sluiten">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted">
              Bedrag ({row.currency})
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={input} />
            </label>
            <label className="text-xs text-muted">
              Aankoopprijs
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={input} />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            Aantal: <span className="font-mono text-text">{quantity > 0 ? Number(quantity.toPrecision(6)) : "—"}</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ["Stop-loss", plan.stopLoss, "text-bear"],
              ["Koersdoel 1", plan.target1, "text-bull"],
              ["Koersdoel 2", plan.target2, "text-bull"],
            ].map(([label, v, cls]) => (
              <div key={label as string} className="rounded-lg bg-panel-2 px-2 py-2">
                <div className="text-muted">{label as string}</div>
                <div className={cn("font-mono font-semibold tabular", cls as string)}>{formatPrice(v as number, row.currency)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost">Annuleren</Button>
            </Dialog.Close>
            <Button variant="bull" onClick={confirm} disabled={!(quantity > 0)}>
              <Check className="h-4 w-4" /> Opslaan in portfolio
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function roundPrice(v: number) {
  return v >= 1 ? Math.round(v * 100) / 100 : Number(v.toPrecision(4));
}
