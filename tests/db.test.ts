import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { Client } from "pg";
import type { Opportunity } from "@/types";

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
    const longPos = position({ symbol: "BTC", type: "crypto", stopLoss: 70000, target1: null, target2: null, horizon: "long" });
    await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: longPos }));
    await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: p }));
    const manual = position();
    await POST(req("/api/portfolio", { method: "POST", cookie: profile, body: manual }));
    const rows = (await (await GET(req("/api/portfolio", { cookie: profile }))).json()).positions;
    expect(rows.find((r: { id: string }) => r.id === p.id)).toMatchObject({ stopLoss: 140, target1: 165, target2: 180, horizon: "short" });
    expect(rows.find((r: { id: string }) => r.id === manual.id)).toMatchObject({ stopLoss: null, target1: null, target2: null, horizon: "short" });
    expect(rows.find((r: { id: string }) => r.id === longPos.id)).toMatchObject({ stopLoss: 70000, target1: null, horizon: "long" });
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

describeDb("Scorebord (tips)", () => {
  const opp = (symbol: string, horizon: "short" | "long") =>
    ({
      horizon,
      row: { symbol, type: "stock", name: symbol, currency: "USD", price: 100 },
      plan: { entryLow: 98, entryHigh: 100, stopLoss: 92, target1: 110, target2: 120, riskPct: 0.08 },
    }) as unknown as Opportunity;

  it("bewaart elke tip één keer per periode en per termijn", async () => {
    const { recordTips } = await import("@/lib/server/tips");
    const { getDb } = await import("@/lib/db");
    const t0 = new Date("2026-10-01T12:00:00Z");
    expect(await recordTips([opp("AAA", "short"), opp("AAA", "long")], t0)).toBe(2);
    expect(await recordTips([opp("AAA", "short"), opp("AAA", "long")], new Date(t0.getTime() + 60_000))).toBe(0);
    // Na 15 dagen telt de korte-termijntip opnieuw, de lange-termijntip nog niet
    expect(await recordTips([opp("AAA", "short"), opp("AAA", "long")], new Date(t0.getTime() + 15 * 86_400_000))).toBe(1);
    const rows = await getDb().tip.findMany({ where: { symbol: "AAA" }, orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => r.horizon)).toEqual(["short", "long", "short"]);
    expect(rows[1].target1).toBeNull();
    expect(rows[0]).toMatchObject({ entry: 100, stopLoss: 92, target1: 110 });
  });

  it("geeft het scorebord terug en kijkt alleen na met echte koersen", async () => {
    const { GET } = await import("@/app/api/track-record/route");
    const body = await (await GET()).json();
    expect(body.enabled).toBe(true);
    expect(body.since).toBeTruthy();
    // In demo-modus zijn er geen echte koersen: dan wordt niets nagekeken
    expect(body.tips).toEqual([]);
    expect(body.summary.short.total).toBe(0);
  });
});

describeDb("Accounts", () => {
  // Een "toestel" bewaart cookies zoals een browser
  function device() {
    const jar = new Map<string, string>();
    const send = (url: string, init: { method?: string; body?: unknown } = {}) =>
      new NextRequest(new URL(url, "http://localhost"), {
        method: init.method ?? "GET",
        headers: {
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    const keep = (res: Response) => {
      for (const c of (res as NextResponse).cookies.getAll()) {
        if (c.value) jar.set(c.name, c.value);
        else jar.delete(c.name);
      }
      return res;
    };
    return { jar, send, keep };
  }
  const json = async (res: Response) => ({ status: res.status, body: await res.json() });

  it("maakt een account, neemt de bestaande watchlist mee en is overal hetzelfde", async () => {
    const { POST: register } = await import("@/app/api/account/register/route");
    const { POST: login } = await import("@/app/api/account/login/route");
    const { GET: me } = await import("@/app/api/account/me/route");
    const { GET: getWatch, POST: addWatch } = await import("@/app/api/watchlist/route");

    // Toestel 1: eerst anoniem iets bewaren, dan een account maken
    const phone = device();
    phone.keep(await addWatch(phone.send("/api/watchlist", { method: "POST", body: { symbol: "ASML", name: "ASML", type: "stock" } })));
    const reg = await json(phone.keep(await register(phone.send("/api/account/register", { method: "POST", body: { username: "  Tim.R ", password: "geheim-genoeg-1" } }))));
    expect(reg).toEqual({ status: 201, body: { user: { username: "tim.r" } } });
    expect(phone.jar.get("br_session")).toBeTruthy();
    expect((await json(await me(phone.send("/api/account/me")))).body.user).toEqual({ username: "tim.r", watchlist: 1, positions: 0 });

    // Dubbele naam en zwakke invoer worden geweigerd
    const other = device();
    expect((await register(other.send("/api/account/register", { method: "POST", body: { username: "TIM.R", password: "nog-iets-anders" } }))).status).toBe(409);
    expect((await json(await register(other.send("/api/account/register", { method: "POST", body: { username: "ab", password: "geheim-genoeg-1" } })))).body.error).toMatch(/3 tot 30/);
    expect((await json(await register(other.send("/api/account/register", { method: "POST", body: { username: "nieuw", password: "kort" } })))).body.error).toMatch(/8 tekens/);

    // Toestel 2: anoniem iets bewaren, dan inloggen → alles samen
    const laptop = device();
    laptop.keep(await addWatch(laptop.send("/api/watchlist", { method: "POST", body: { symbol: "BTC", name: "Bitcoin", type: "crypto" } })));
    expect((await login(laptop.send("/api/account/login", { method: "POST", body: { username: "tim.r", password: "fout-wachtwoord" } }))).status).toBe(401);
    const ok = await json(laptop.keep(await login(laptop.send("/api/account/login", { method: "POST", body: { username: "Tim.R", password: "geheim-genoeg-1" } }))));
    expect(ok.status).toBe(200);
    const items = (await json(await getWatch(laptop.send("/api/watchlist")))).body.items.map((i: { symbol: string }) => i.symbol).sort();
    expect(items).toEqual(["ASML", "BTC"]);
    // En toestel 1 ziet dat ook
    expect((await json(await getWatch(phone.send("/api/watchlist")))).body.items).toHaveLength(2);
  });

  it("toont na uitloggen niets meer van het account, ook niet met de oude profielcookie", async () => {
    const { POST: register } = await import("@/app/api/account/register/route");
    const { POST: logout } = await import("@/app/api/account/logout/route");
    const { GET: me } = await import("@/app/api/account/me/route");
    const { GET: getWatch, POST: addWatch } = await import("@/app/api/watchlist/route");

    const d = device();
    d.keep(await register(d.send("/api/account/register", { method: "POST", body: { username: "uitlog-test", password: "geheim-genoeg-2" } })));
    await addWatch(d.send("/api/watchlist", { method: "POST", body: { symbol: "NVDA", name: "NVIDIA", type: "stock" } }));
    const oldProfile = d.jar.get("br_profile")!;
    const oldSession = d.jar.get("br_session")!;

    d.keep(await logout(d.send("/api/account/logout", { method: "POST", body: {} })));
    expect(d.jar.has("br_session")).toBe(false);
    expect((await json(await me(d.send("/api/account/me")))).body.user).toBeNull();

    // Iemand die de oude cookies nog heeft, komt er niet meer in
    const thief = device();
    thief.jar.set("br_profile", oldProfile);
    thief.jar.set("br_session", oldSession);
    expect((await json(await getWatch(thief.send("/api/watchlist")))).body.items).toEqual([]);
  });

  it("zet een account na 5 foute pogingen 15 minuten op slot", async () => {
    const { POST: register } = await import("@/app/api/account/register/route");
    const { POST: login } = await import("@/app/api/account/login/route");
    const d = device();
    await register(d.send("/api/account/register", { method: "POST", body: { username: "slot-test", password: "juist-wachtwoord" } }));
    const attempt = (password: string) => login(device().send("/api/account/login", { method: "POST", body: { username: "slot-test", password } }));
    for (let i = 0; i < 5; i++) expect((await attempt("fout")).status).toBe(401);
    const locked = await json(await attempt("juist-wachtwoord"));
    expect(locked.status).toBe(429);
    expect(locked.body.error).toMatch(/15 min/);
    expect((await attempt("x")).status).toBe(429);
  }, 30_000);

  it("bewaart wachtwoorden alleen als scrypt-hash en sessies alleen als hash", async () => {
    const { getDb } = await import("@/lib/db");
    const user = await getDb().user.findUnique({ where: { username: "tim.r" }, include: { sessions: true } });
    expect(user!.passwordHash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(user!.passwordHash).not.toContain("geheim-genoeg-1");
    expect(user!.sessions.length).toBeGreaterThan(0);
    for (const s of user!.sessions) expect(s.id).toMatch(/^[0-9a-f]{64}$/);
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
