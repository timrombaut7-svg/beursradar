"use client";
import { useRef, useState } from "react";
import { Camera, Check, ImageUp, Loader2, X } from "lucide-react";
import type { ImportProposal } from "@/lib/portfolio/screenshot";
import { usePortfolio } from "@/lib/store/portfolio";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = ImportProposal & { key: string; selected: boolean; qtyText: string; priceText: string };

/**
 * Maakt de screenshot beter leesbaar voor de tekstherkenning: grijs, donkere modus omgekeerd
 * (lichte tekst op donker leest slecht) en kleine afbeeldingen vergroot.
 */
async function prepareImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width < 1200 ? 2 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const dark = sum / (d.length / 4) < 128;
  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (dark) g = 255 - g;
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const toNumber = (t: string) => {
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Screenshot van je portfolio in een andere app → posities in Beursradar. */
export function ScreenshotImport() {
  const { positions, add, remove } = usePortfolio();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ step: "idle" | "reading" | "matching" | "review" | "done" | "error"; progress?: number; message?: string }>({ step: "idle" });
  const [rows, setRows] = useState<Row[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [removeOthers, setRemoveOthers] = useState(false);

  const reset = () => {
    setRows([]);
    setOcrText("");
    setStatus({ step: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setStatus({ step: "error", message: "Kies een afbeelding (screenshot)." });
    setRows([]);
    setStatus({ step: "reading", progress: 0 });
    try {
      // Tekstherkenning in je eigen browser: de screenshot wordt nergens heen gestuurd
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["nld", "eng"], 1, {
        logger: (m) => m.status === "recognizing text" && setStatus({ step: "reading", progress: m.progress }),
      });
      const canvas = await prepareImage(file);
      const { data } = await worker.recognize(canvas);
      await worker.terminate();
      setOcrText(data.text);

      setStatus({ step: "matching" });
      const res = await fetch("/api/portfolio/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.text.slice(0, 20_000) }),
      });
      const json = (await res.json()) as { proposals?: ImportProposal[]; error?: string };
      if (!res.ok || !json.proposals) throw new Error(json.error ?? "Herkennen mislukt");
      setRows(
        json.proposals.map((p) => ({
          ...p,
          key: `${p.type}:${p.symbol}`,
          selected: true,
          qtyText: String(Number(p.quantity.toPrecision(8))),
          priceText: p.buyPrice.toFixed(p.buyPrice < 1 ? 6 : 2),
        })),
      );
      setStatus({ step: "review" });
    } catch (err) {
      setStatus({ step: "error", message: `Dat lukte niet: ${(err as Error).message}` });
    }
  };

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.selected && toNumber(r.qtyText) && toNumber(r.priceText));

  const apply = () => {
    const today = new Date().toISOString().slice(0, 10);
    const keys = new Set(chosen.map((r) => r.key));
    for (const r of chosen) {
      const existing = positions.filter((p) => p.symbol === r.symbol && p.type === r.type);
      // De oudste aankoopdatum blijft bewaard; de positie wordt vervangen door wat op de screenshot staat
      const buyDate = existing.map((p) => p.buyDate).sort()[0] ?? today;
      const horizon = existing[0]?.horizon ?? "long";
      existing.forEach((p) => remove(p.id));
      add({ symbol: r.symbol, name: r.name, type: r.type, quantity: toNumber(r.qtyText)!, buyPrice: toNumber(r.priceText)!, buyDate, currency: r.currency, horizon });
    }
    if (removeOthers) positions.filter((p) => !keys.has(`${p.type}:${p.symbol}`)).forEach((p) => remove(p.id));
    setStatus({ step: "done", message: `${chosen.length} ${chosen.length === 1 ? "positie" : "posities"} bijgewerkt.` });
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const busy = status.step === "reading" || status.step === "matching";
  const input = "h-8 w-full rounded-md border border-border bg-panel px-2 text-right font-mono text-sm outline-none focus:border-accent/60";

  return (
    <Card>
      <CardHeader
        icon={<Camera className="h-4 w-4" />}
        title="Importeer uit een screenshot"
        subtitle="Maak een screenshot van je portfolio in een andere app (DEGIRO, Trade Republic, Bitvavo, …) en zet hem hier in."
      />
      <CardBody className="space-y-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

        {(status.step === "idle" || status.step === "done" || status.step === "error") && (
          <div className="space-y-2">
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              <ImageUp className="h-4 w-4" /> Kies screenshot
            </Button>
            {status.message && (
              <p className={cn("text-sm", status.step === "error" ? "text-bear" : "text-bull")}>
                {status.step === "done" && <Check className="mr-1 inline h-4 w-4" />}
                {status.message}
              </p>
            )}
            <p className="text-xs text-muted">
              De tekst wordt in je eigen browser gelezen; de afbeelding wordt niet geüpload. Je ziet eerst wat de app herkent en kiest
              daarna zelf of het in je portfolio komt.
            </p>
          </div>
        )}

        {busy && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status.step === "reading" ? "Tekst op de screenshot lezen…" : "Beleggingen herkennen…"}
            </p>
            {status.step === "reading" && (
              <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full bg-accent transition-all" style={{ width: `${Math.round((status.progress ?? 0) * 100)}%` }} />
              </div>
            )}
            <p className="text-xs text-muted">De eerste keer duurt dit wat langer (de leessoftware wordt geladen).</p>
          </div>
        )}

        {status.step === "review" && rows.length === 0 && (
          <div className="space-y-2 text-sm">
            <p>Er is geen belegging herkend op deze screenshot.</p>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
              <li>Zorg dat de namen of tickers en de aantallen of bedragen goed leesbaar in beeld staan.</li>
              <li>Alleen beleggingen die in Beursradar staan worden herkend.</li>
            </ul>
            <Button variant="ghost" onClick={reset}>
              Opnieuw proberen
            </Button>
          </div>
        )}

        {status.step === "review" && rows.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm">
              Gevonden: <strong>{rows.length}</strong> {rows.length === 1 ? "belegging" : "beleggingen"}. Controleer de aantallen en pas aan waar nodig.
            </p>
            <ul className="space-y-2">
              {rows.map((r) => {
                const current = positions.filter((p) => p.symbol === r.symbol && p.type === r.type).reduce((s, p) => s + p.quantity, 0);
                return (
                  <li key={r.key} className={cn("rounded-xl border p-3", r.selected ? "border-border bg-panel-2/60" : "border-border/50 opacity-60")}>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" checked={r.selected} onChange={(e) => update(r.key, { selected: e.target.checked })} className="mt-1 accent-[var(--accent)]" />
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-sm font-semibold">{r.symbol}</span> <span className="text-sm text-muted">{r.name}</span>
                        <span className="block truncate text-[11px] text-muted">Gelezen: {r.source}</span>
                        {current > 0 && <span className="block text-[11px] text-hold">Vervangt je huidige {Number(current.toPrecision(8))} stuks</span>}
                      </span>
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                      <label className="text-[11px] text-muted">
                        Aantal{r.quantityFrom === "value" && <span className="text-hold"> (geschat uit de waarde)</span>}
                        <input value={r.qtyText} onChange={(e) => update(r.key, { qtyText: e.target.value })} inputMode="decimal" className={cn(input, "mt-0.5")} />
                      </label>
                      <label className="text-[11px] text-muted">
                        Aankoopprijs ({r.currency}){r.buyPriceFrom === "current" && <span className="text-hold"> (= huidige koers)</span>}
                        <input value={r.priceText} onChange={(e) => update(r.key, { priceText: e.target.value })} inputMode="decimal" className={cn(input, "mt-0.5")} />
                      </label>
                    </div>
                    {r.price > 0 && toNumber(r.qtyText) && (
                      <p className="mt-1 pl-6 text-[11px] text-muted">Waarde nu: {formatPrice(toNumber(r.qtyText)! * r.price, r.currency)}</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {positions.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={removeOthers} onChange={(e) => setRemoveOthers(e.target.checked)} className="accent-[var(--accent)]" />
                Verwijder posities die niet op de screenshot staan
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={apply} disabled={!chosen.length}>
                <Check className="h-4 w-4" /> Zet in mijn portfolio ({chosen.length})
              </Button>
              <Button variant="ghost" onClick={reset}>
                <X className="h-4 w-4" /> Annuleren
              </Button>
            </div>
          </div>
        )}

        {ocrText && status.step !== "idle" && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer">Wat de app op de screenshot las</summary>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-panel-2 p-2 font-mono text-[11px]">{ocrText}</pre>
          </details>
        )}
      </CardBody>
    </Card>
  );
}
