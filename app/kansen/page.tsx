import type { Metadata } from "next";
import { OpportunityList } from "@/components/kansen/OpportunityList";
import { HoldingsAdvice } from "@/components/kansen/HoldingsAdvice";

export const metadata: Metadata = { title: "Kansen" };

export default function KansenPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kansen</h1>
        <p className="text-sm text-muted">
          Assets met een koopsignaal op korte termijn (1–4 weken), en verkoopadvies voor wat je hebt gekocht. Dit is een
          algoritme, geen financieel advies.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <OpportunityList />
        <HoldingsAdvice />
      </div>
    </div>
  );
}
