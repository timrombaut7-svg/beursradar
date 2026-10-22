/**
 * Zet de woorden die de tekstherkenning vond (met hun positie) terug in visuele rijen.
 * Apps tonen een belegging als rij: naam links, bedragen rechts. De tekstherkenning leest zulke
 * kolommen soms los van elkaar (eerst alle namen, dan alle bedragen); door woorden op dezelfde
 * hoogte weer samen te voegen blijft alles van één belegging bij elkaar.
 */

export interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function rowsFromWords(words: OcrWord[]): string {
  const clean = words.filter((w) => w.text.trim() && w.y1 > w.y0);
  if (!clean.length) return "";
  const center = (w: OcrWord) => (w.y0 + w.y1) / 2;
  const rows: { center: number; height: number; words: OcrWord[] }[] = [];
  for (const w of [...clean].sort((a, b) => center(a) - center(b))) {
    const h = w.y1 - w.y0;
    const row = rows[rows.length - 1];
    // Zelfde rij als het midden binnen de halve hoogte van de rij (en van het woord) valt
    if (row && Math.abs(center(w) - row.center) <= Math.min(row.height, h) * 0.5) {
      row.words.push(w);
      row.center = (row.center * (row.words.length - 1) + center(w)) / row.words.length;
      row.height = Math.max(row.height, h);
    } else rows.push({ center: center(w), height: h, words: [w] });
  }
  return rows.map((r) => r.words.sort((a, b) => a.x0 - b.x0).map((w) => w.text.trim()).join(" ")).join("\n");
}

/** Alle woorden uit het resultaat van tesseract.js (blocks → paragraphs → lines → words). */
export function wordsFromBlocks(
  blocks: { paragraphs: { lines: { words: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] }[] }[] }[] | null | undefined,
): OcrWord[] {
  return (blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words.map((w) => ({ text: w.text, ...w.bbox })))));
}
