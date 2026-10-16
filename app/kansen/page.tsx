import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { OpportunityList } from "@/components/kansen/OpportunityList";
import { HoldingsAdvice } from "@/components/kansen/HoldingsAdvice";
import { TrackRecord } from "@/components/kansen/TrackRecord";

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
            (maanden tot jaren), met uitleg in gewone taal. Elke tip is getest op de koersen van de afgelopen jaren. Rechts zie je wanneer je moet verkopen en hoe eerdere tips uitpakten. Dit is een algoritme,
            geen financieel advies.
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <OpportunityList />
        <div className="space-y-4">
          <HoldingsAdvice />
          <TrackRecord />
        </div>
      </div>
    </div>
  );
}
