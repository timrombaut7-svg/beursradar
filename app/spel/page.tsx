import type { Metadata } from "next";
import { Gamepad2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioTabs } from "@/components/oefen/PortfolioTabs";
import { GameView } from "@/components/oefen/GameView";

export const metadata: Metadata = { title: "€100.000-spel" };

export default function SpelPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PortfolioTabs />
      <PageHeader
        icon={<Gamepad2 className="h-5 w-5" />}
        title="€100.000-spel"
        subtitle="Je krijgt € 100.000 nepgeld. Beleg het tegen echte, live koersen en kijk hoeveel je ervan maakt."
      />
      <GameView />
    </div>
  );
}
