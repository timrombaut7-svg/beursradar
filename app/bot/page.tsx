import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioTabs } from "@/components/oefen/PortfolioTabs";
import { BotView } from "@/components/oefen/BotView";

export const metadata: Metadata = { title: "Trading bot" };

export default function BotPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PortfolioTabs />
      <PageHeader
        icon={<Bot className="h-5 w-5" />}
        title="Trading bot"
        subtitle="Een bot die helemaal zelf € 100.000 nepgeld beheert en zo snel mogelijk winst probeert te maken."
      />
      <BotView />
    </div>
  );
}
