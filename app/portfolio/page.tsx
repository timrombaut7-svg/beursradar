import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { StorageLabel } from "@/components/StorageBadge";

export const metadata: Metadata = { title: "Portfolio simulator" };

export default function PortfolioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio simulator</h1>
        <p className="text-sm text-muted">
          Fictieve posities, realtime PnL en risicospreiding · <StorageLabel />
        </p>
      </div>
      <PortfolioView />
    </div>
  );
}
