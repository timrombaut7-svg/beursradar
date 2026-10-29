import webpush from "web-push";
import { getDb } from "@/lib/db";
import { getSignals } from "@/lib/engine/signals";
import { getLivePrices } from "@/lib/api/livePrices";
import { sellAdvice } from "@/lib/engine/sellAdvice";
import { alertMessage, alertsToSend, ALERT_REPEAT_HOURS, type AlertCandidate } from "@/lib/engine/sellAlerts";
import type { AssetType } from "@/types";

/**
 * Pushmeldingen (Web Push). De VAPID-sleutels maakt de app de eerste keer zelf aan en bewaart ze
 * in de database, zodat er niets in Vercel ingesteld hoeft te worden en niets in de (openbare) code staat.
 */

let keys: Promise<{ publicKey: string; privateKey: string }> | null = null;

export function vapidKeys() {
  keys ??= (async () => {
    const db = getDb();
    const found = await db.appSecret.findUnique({ where: { key: "vapid" } });
    if (found) return JSON.parse(found.value);
    const fresh = webpush.generateVAPIDKeys();
    // Twee servers tegelijk? Dan wint de eerste en lezen we die opnieuw
    await db.appSecret.createMany({ data: [{ key: "vapid", value: JSON.stringify(fresh) }], skipDuplicates: true });
    const saved = await db.appSecret.findUniqueOrThrow({ where: { key: "vapid" } });
    return JSON.parse(saved.value);
  })().catch((err) => {
    keys = null;
    throw err;
  });
  return keys;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Stuurt een melding naar alle toestellen van een profiel; verlopen abonnementen worden opgeruimd. */
export async function sendToProfile(profileId: string, payload: PushPayload): Promise<number> {
  const db = getDb();
  const { publicKey, privateKey } = await vapidKeys();
  const subs = await db.pushSubscription.findMany({ where: { profileId } });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { vapidDetails: { subject: "https://beursradar.vercel.app", publicKey, privateKey }, TTL: 60 * 60 * 12 },
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.warn("[push] versturen mislukt:", status, (err as Error).message);
      }
    }),
  );
  return sent;
}

/**
 * Bekijkt de posities van iedereen die meldingen aan heeft en stuurt een melding als het advies
 * "verkopen" of "deels winst nemen" is (hetzelfde advies als op de Portfolio-pagina).
 */
export async function checkSellAlerts(now = new Date()): Promise<{ profiles: number; alerts: number }> {
  const db = getDb();
  const profiles = await db.profile.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true, positions: true },
  });
  const withPositions = profiles.filter((p) => p.positions.length > 0);
  if (!withPositions.length) return { profiles: 0, alerts: 0 };

  const assets = [
    ...new Map(withPositions.flatMap((p) => p.positions.map((x) => [`${x.type}:${x.symbol}`, { symbol: x.symbol, type: x.type as AssetType }]))).values(),
  ];
  const [signals, live] = await Promise.all([getSignals(assets), getLivePrices(assets)]);

  let alerts = 0;
  for (const profile of withPositions) {
    const candidates: AlertCandidate[] = profile.positions.flatMap((pos) => {
      const signal = signals.find((s) => s.symbol === pos.symbol && s.type === pos.type);
      // Nooit een verkoopmelding op basis van voorbeeldkoersen
      if (!signal?.pricesLive) return [];
      const price = live.find((l) => l.symbol === pos.symbol && l.type === pos.type)?.price ?? signal.price;
      const horizon = pos.horizon === "long" ? "long" : "short";
      const advice = sellAdvice({ ...pos, horizon }, price, horizon === "long" ? signal.longTerm : signal.shortTerm);
      return [{ positionId: pos.id, symbol: pos.symbol, name: pos.name, advice }];
    });
    const recent = await db.sellAlert.findMany({
      where: { profileId: profile.id, createdAt: { gte: new Date(now.getTime() - ALERT_REPEAT_HOURS * 3_600_000) } },
    });
    for (const c of alertsToSend(candidates, recent, now)) {
      const msg = alertMessage(c);
      const sent = await sendToProfile(profile.id, { ...msg, url: "/portfolio", tag: `sell-${c.positionId}` });
      if (sent > 0) {
        await db.sellAlert.create({ data: { profileId: profile.id, positionId: c.positionId, action: c.advice.action } });
        alerts++;
      }
    }
  }
  return { profiles: withPositions.length, alerts };
}
