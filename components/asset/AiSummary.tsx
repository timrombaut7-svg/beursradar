"use client";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import type { AssetType } from "@/types";
import { useAiSummary } from "@/lib/hooks";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Optionele LLM-samenvatting (vereist ANTHROPIC_API_KEY op de server). */
export function AiSummary({ type, symbol }: { type: AssetType; symbol: string }) {
  const [requested, setRequested] = useState(false);
  const { data, isFetching } = useAiSummary(type, symbol, requested);
  if (data && data.enabled === false) return null;
  return (
    <Card>
      <CardHeader icon={<Sparkles className="h-4 w-4" />} title="AI-samenvatting" subtitle="Claude vat de beslissingsmatrix samen in gewone taal" />
      <CardBody>
        {!requested && (
          <Button size="sm" variant="primary" onClick={() => setRequested(true)}>
            <Sparkles className="h-4 w-4" /> Genereer samenvatting
          </Button>
        )}
        {isFetching && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse wordt samengevat…
          </p>
        )}
        {data?.summary && <p className="whitespace-pre-line text-sm leading-relaxed">{data.summary}</p>}
        {data?.error && <p className="text-sm text-bear">{data.error}</p>}
      </CardBody>
    </Card>
  );
}
