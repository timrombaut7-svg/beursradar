import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { Client } from "pg";

/**
 * Integratietests voor de database-API's. Per run wordt een tijdelijke
 * PostgreSQL-database aangemaakt op TEST_DATABASE_URL, de echte migraties
 * worden toegepast en na afloop wordt de database weer verwijderd.
 *
 * Lokaal: TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm test
 * In CI is TEST_DATABASE_URL verplicht (zie .github/workflows/ci.yml).
 */

const baseUrl = process.env.TEST_DATABASE_URL;
if (!baseUrl && process.env.CI) throw new Error("TEST_DATABASE_URL is verplicht in CI");
const describeDb = baseUrl ? describe : describe.skip;

const dbName = `beursradar_test_${process.pid}_${Date.now()}`;
let prevUrl: string | undefined;

async function admin<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: baseUrl });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

beforeAll(async () => {
  if (!baseUrl) return;
  await admin((c) => c.query(`CREATE DATABASE "${dbName}"`));
  const url = new URL(baseUrl);
  url.pathname = `/${dbName}`;
  prevUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = url.toString();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL_UNPOOLED: url.toString() },
    stdio: "pipe",
  });
}, 60_000);

afterAll(async () => {
  if (!baseUrl) return;
  const { getDb } = await import("@/lib/db");
  await getDb().$disconnect();
  process.env.DATABASE_URL = prevUrl;
  await admin((c) => c.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`));
});

function req(url: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.cookie ? { Cookie: `br_profile=${init.cookie}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

/** Profiel-cookie uit een response halen. */
function profileFrom(res: Response): string {
  const m = /br_profile=([^;]+)/.exec(res.headers.get("set-cookie") ?? "");
  if (!m) throw new Error("geen profiel-cookie gezet");
  return m[1];
}

const position = (over: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  symbol: "nvda",
  name: "NVIDIA",
  type: "stock",
  quantity: 10,
  buyPrice: 150.5,
  buyDate: "2026-03-01",
  currency: "usd",
  ...over,
});

describeDb("Watchlist API", () => {
  it("maakt een anoniem profiel aan en bewaart items per profiel", async () => {
    const { GET, POST, DELETE } = await import("@/app/api/watchlist/route");
    const first = await GET(req("/api/watchlist"));
    expect(first.status).toBe(200);
    const profile = profileFrom(first);
    expect(await first.json()).toEqual({ enabled: true, items: [] });

    const add = await POST(req("/api/watchlist", { method: "POST", cookie: profile, body: { symbol: "btc", name: "Bitcoin", type: "crypto" } }));
    expect(add.status).toBe(201);
    expect(add.headers.get("set-cookie")).toBeNull(); // bestaand profiel: geen nieuwe cookie
    // Idempotent: dubbel toevoegen geeft geen duplicaat
    await POST(req("/api/watchlist", { method: "POST", cookie: profile, body: { symbol: "BTC", name: "Bitcoin", type: "crypto" } }));

    const list = await (await GET(req("/api/watchlist", { cookie: profile }))).json();
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ symbol: "BTC", type: "crypto" });

    // Een ander profiel ziet deze data niet
    const other = await (await GET(req("/api/watchlist"))).json();
    expect(other.items).toEqual([]);

    const del = await DELETE(req("/api/watchlist?type=crypto&symbol=BTC", { method: "DELETE", cookie: profile }));
    expect(await del.json()).toEqual({ deleted: 1 });
  });

  it("valideert invoer", async () => {
    const { POST } = await import("@/app/api/watchlist/route");
    const bad = await POST(req("/api/watchlist", { method: "POST", body: { symbol: "<script>", name: "x", type: "stock" } }));
    expect(bad.status).toBe(400);
    const badType = await POST(req("/api/watchlist", { method: "POST", body: { symbol: "AAPL", name: "Apple", type: "bond" } }));
    expect(badType.status).toBe(400);
  });
});

describeDb("Portfolio API", () => {
  it("voegt posities toe, normaliseert velden en verwijdert alleen eigen posities", async () => {
    const { GET, POST, DELETE } = await import("@/app/api/portfolio/route");
    const profile = profileFrom(await GET(req("/api/portfolio")));
    const p = position();
    const created = await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: p }));
    expect(created.status).toBe(201);
    expect((await created.json()).position).toMatchObject({ id: p.id, symbol: "NVDA", currency: "USD", quantity: 10, buyPrice: 150.5 });

    // Retry met hetzelfde id is idempotent
    expect((await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: p }))).status).toBe(200);

    // Een ander profiel kan dit id niet overnemen of verwijderen
    const intruder = profileFrom(await GET(req("/api/portfolio")));
    expect((await POST(req("/api/portfolio", { method: "POST", cookie: intruder, body: p }))).status).toBe(400);
    expect(await (await DELETE(req(`/api/portfolio?id=${p.id}`, { method: "DELETE", cookie: intruder }))).json()).toEqual({ deleted: 0 });

    await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: position({ symbol: "BTC", type: "crypto" }) }));
    expect((await (await GET(req("/api/portfolio", { cookie: profile }))).json()).positions).toHaveLength(2);

    expect(await (await DELETE(req(`/api/portfolio?id=${p.id}`, { method: "DELETE", cookie: profile }))).json()).toEqual({ deleted: 1 });
    expect(await (await DELETE(req("/api/portfolio?all=1", { method: "DELETE", cookie: profile }))).json()).toEqual({ deleted: 1 });
  });

  it("bewaart het tradeplan van een gekochte positie", async () => {
    const { GET, POST } = await import("@/app/api/portfolio/route");
    const profile = profileFrom(await GET(req("/api/portfolio")));
    const p = position({ stopLoss: 140, target1: 165, target2: 180 });
    await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: p }));
    const manual = position();
    await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: manual }));
    const rows = (await (await GET(req("/api/portfolio", { cookie: profile }))).json()).positions;
    expect(rows.find((r: { id: string }) => r.id === p.id)).toMatchObject({ stopLoss: 140, target1: 165, target2: 180 });
    expect(rows.find((r: { id: string }) => r.id === manual.id)).toMatchObject({ stopLoss: null, target1: null, target2: null });
  });

  it("weigert ongeldige posities", async () => {
    const { POST } = await import("@/app/api/portfolio/route");
    for (const bad of [position({ quantity: -1 }), position({ buyDate: "1-3-2026" }), position({ id: "geen-uuid" })]) {
      expect((await POST(req("/api/portfolio", { method: "POST", body: bad }))).status).toBe(400);
    }
  });
});

describeDb("LocalStorage-import", () => {
  it("importeert één keer in een leeg profiel en is daarna een no-op", async () => {
    const { POST } = await import("@/app/api/sync/route");
    const { GET } = await import("@/app/api/portfolio/route");
    const profile = profileFrom(await GET(req("/api/portfolio")));
    const body = {
      watchlist: [
        { symbol: "BTC", name: "Bitcoin", type: "crypto" },
        { symbol: "btc", name: "Bitcoin", type: "crypto" },
        { symbol: "ASML", name: "ASML", type: "stock" },
      ],
      positions: [position()],
    };
    expect(await (await POST(req("/api/sync", { method: "POST", cookie: profile, body }))).json()).toEqual({ imported: true });
    expect(await (await POST(req("/api/sync", { method: "POST", cookie: profile, body }))).json()).toEqual({ imported: false });

    const { GET: getWatch } = await import("@/app/api/watchlist/route");
    expect((await (await getWatch(req("/api/watchlist", { cookie: profile }))).json()).items).toHaveLength(2);
    expect((await (await GET(req("/api/portfolio", { cookie: profile }))).json()).positions).toHaveLength(1);
  });
});

describe("Zonder database", () => {
  it("geeft 503 zodat de client in LocalStorage-modus blijft", async () => {
    const { GET } = await import("@/app/api/watchlist/route");
    const url = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const res = await GET(req("/api/watchlist"));
      expect(res.status).toBe(503);
      expect((await res.json()).enabled).toBe(false);
    } finally {
      process.env.DATABASE_URL = url;
    }
  });
});
