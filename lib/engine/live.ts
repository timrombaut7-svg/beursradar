import type { Candle, LivePrice } from "@/types";

const DAY = 86400;

/**
 * Verwerkt een live koers in een reeks dagcandles, zodat indicatoren en signalen
 * meteen op de actuele prijs reageren:
 *  - zelfde (UTC-)dag als de laatste candle → close/high/low bijwerken
 *  - een nieuwere dag → nieuwe candle toevoegen
 *  - een oudere koers → niets doen
 */
export function applyLivePrice(candles: Candle[], live: Pick<LivePrice, "price" | "time">): Candle[] {
  if (!candles.length || !(live.price > 0)) return candles;
  const last = candles[candles.length - 1];
  const liveSec = Math.floor(live.time / 1000);
  const lastDay = Math.floor(last.time / DAY);
  const liveDay = Math.floor(liveSec / DAY);
  if (liveDay < lastDay) return candles;
  if (liveDay === lastDay) {
    return [
      ...candles.slice(0, -1),
      { ...last, close: live.price, high: Math.max(last.high, live.price), low: Math.min(last.low, live.price) },
    ];
  }
  const time = Math.max(liveDay * DAY, last.time + 1);
  return [...candles, { time, open: last.close, high: Math.max(last.close, live.price), low: Math.min(last.close, live.price), close: live.price, volume: 0 }];
}
