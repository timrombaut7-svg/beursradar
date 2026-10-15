"use client";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { AssetType } from "@/types";
import { useAnalysis } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AssetHeader } from "./AssetHeader";
import { PriceChart } from "./PriceChart";
import { DecisionBanner } from "./DecisionBanner";
import { ActionPlanCard } from "./ActionPlanCard";
import { IndicatorPanel } from "./IndicatorPanel";
import { PillarTabs } from "./PillarTabs";
import { BacktestCard } from "./BacktestCard";
import { AiSummary } from "./AiSummary";
import { DataSources } from "./DataSources";

export function AssetView({ type, symbol }: { type: AssetType; symbol: string }) {
  const { data: a, isLoading, isError, error, refetch, isFetching } = useAnalysis(type, symbol);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <Skeleton className="h-[560px]" />
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
    );
  }
  if (isError || !a) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-bear" />
        <p className="mb-4 text-sm text-muted">Analyse kon niet geladen worden: {(error as Error)?.message}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Opnieuw proberen
        </Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <AssetHeader a={a} />
      <div className="flex items-center justify-between gap-3">
        <DataSources sources={a.dataSources} generatedAt={a.generatedAt} />
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} aria-label="Ververs analyse">
          <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* Signaal eerst op mobiel, rechts op desktop */}
        <div className="order-2 min-w-0 space-y-4 xl:order-1">
          <PriceChart type={type} symbol={a.asset.symbol} technical={a.technical} />
          <PillarTabs a={a} />
          <BacktestCard a={a} />
        </div>
        <aside className="order-1 space-y-4 xl:order-2">
          <DecisionBanner a={a} />
          <ActionPlanCard a={a} />
          <IndicatorPanel a={a} />
          <AiSummary type={type} symbol={a.asset.symbol} />
        </aside>
      </div>
    </motion.div>
  );
}
