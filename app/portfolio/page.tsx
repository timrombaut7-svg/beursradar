import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { StorageLabel } from "@/components/StorageBadge";

export const metadata: Metadata = { title: "Portfolio simulator" };

export default function PortfolioPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Briefcase className="h-5 w-5" />}
        title="Portfolio simulator"
        subtitle={
          <>
            Fictieve posities, realtime PnL en risicospreiding · <StorageLabel />
          </>
        }
      />
      <PortfolioView />
    </div>
  );
}
