import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { OpportunityList } from "@/components/kansen/OpportunityList";
import { HoldingsAdvice } from "@/components/kansen/HoldingsAdvice";

export const metadata: Metadata = { title: "Kansen" };

export default function KansenPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Lightbulb className="h-5 w-5" />}
        title="Kansen"
        subtitle={
          <>
            Aandelen en crypto die nu interessant zijn om te kopen, voor de korte termijn (weken) of de lange termijn
            (maanden tot jaren), met uitleg in gewone taal. Rechts zie je wanneer je moet verkopen. Dit is een algoritme,
            geen financieel advies.
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <OpportunityList />
        <HoldingsAdvice />
      </div>
    </div>
  );
}
