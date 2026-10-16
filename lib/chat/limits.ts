import { dbEnabled, getDb } from "@/lib/db";

/**
 * Daglimieten voor de AI-chat, zodat een openbare site niet onbeperkt
 * API-kosten kan maken. Met database wordt geteld in Postgres (werkt over
 * alle serverless instanties heen), anders in het geheugen van de instantie.
 */

// Standaard: ± $0,05 per vraag → maximaal ± $5–15 per dag. Aanpasbaar via env-variabelen.
export const PER_USER_DAILY = Number(process.env.CHAT_PER_USER_DAILY ?? 20);
export const GLOBAL_DAILY = Number(process.env.CHAT_GLOBAL_DAILY ?? 100);

const memory = new Map<string, number>();

const today = () => new Date().toISOString().slice(0, 10);

async function increment(key: string): Promise<number> {
  const day = today();
  if (!dbEnabled()) {
    const k = `${key}:${day}`;
    const n = (memory.get(k) ?? 0) + 1;
    memory.set(k, n);
    return n;
  }
  const row = await getDb().chatUsage.upsert({
    where: { key_day: { key, day } },
    create: { key, day, count: 1 },
    update: { count: { increment: 1 } },
  });
  return row.count;
}

export type LimitResult = { ok: true; remaining: number } | { ok: false; reason: string };

/** Telt één bericht en meldt of het nog binnen de limieten valt. */
export async function consumeChatQuota(userKey: string): Promise<LimitResult> {
  const user = await increment(`user:${userKey}`);
  if (user > PER_USER_DAILY) {
    return { ok: false, reason: `Je hebt vandaag het maximum van ${PER_USER_DAILY} vragen bereikt. Morgen kan het weer.` };
  }
  const global = await increment("global");
  if (global > GLOBAL_DAILY) {
    return { ok: false, reason: "De AI-assistent heeft vandaag zijn daglimiet bereikt. Morgen kan het weer." };
  }
  return { ok: true, remaining: PER_USER_DAILY - user };
}
