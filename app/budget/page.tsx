import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { BudgetPlanner } from "@/components/budget/BudgetPlanner";

export const metadata: Metadata = { title: "Budget verdelen" };

export default function BudgetPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        icon={<Wallet className="h-5 w-5" />}
        title="Budget verdelen"
        subtitle="Vul in hoeveel je wilt beleggen. De app verdeelt het over ETF's, aandelen en crypto die nu de historische toets halen."
      />
      <BudgetPlanner />
    </div>
  );
}
