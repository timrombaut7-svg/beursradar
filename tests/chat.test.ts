import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { buildChatTools, analysisForModel } from "@/lib/chat/tools";
import { consumeChatQuota } from "@/lib/chat/limits";
import { analyzeAsset } from "@/lib/engine/analyze";

beforeAll(() => {
  process.env.USE_MOCK_DATA = "1";
});

function tools(positions: Parameters<typeof buildChatTools>[0]["positions"] = []) {
  const statuses: string[] = [];
  const list = buildChatTools({ positions, report: (s) => statuses.push(s) });
  type Loose = { parse: (x: unknown) => unknown; run: (x: unknown) => Promise<unknown> | unknown };
  const byName = Object.fromEntries(list.map((t) => [t.name, t as unknown as Loose]));
  const call = async (name: string, input: unknown) => JSON.parse(String(await byName[name].run(byName[name].parse(input))));
  return { list, call, statuses };
}

describe("AI-tools", () => {
  it("biedt de verwachte tools met Nederlandse beschrijvingen", () => {
    const names = tools().list.map((t) => t.name);
    expect(names).toEqual(["search_asset", "get_analysis", "get_opportunities", "get_my_portfolio", "get_market_overview"]);
  });

  it("get_analysis geeft echte engine-data terug en meldt de voortgang", async () => {
    const t = tools();
    const res = await t.call("get_analysis", { symbol: "nvda", type: "stock" });
    const a = await analyzeAsset("NVDA", "stock");
    expect(res.asset.symbol).toBe("NVDA");
    expect(res.signaalKorteTermijn.advies).toBe(a.shortTerm.advice);
    expect(res.planKorteTermijn.stopLoss).toBeCloseTo(a.tradePlan.stopLoss);
    expect(res.planKorteTermijn.uitleg.why).toBeInstanceOf(Array);
    expect(res.factoren.every((f: { punten: string }) => !f.punten.startsWith("0/"))).toBe(true);
    expect(t.statuses).toContain("Analyse van NVDA ophalen…");
  });

  it("get_analysis weigert ongeldige invoer", () => {
    const t = tools();
    const tool = t.list.find((x) => x.name === "get_analysis")!;
    expect(() => tool.parse({ symbol: "<script>", type: "stock" })).toThrow();
    expect(() => tool.parse({ symbol: "AAPL", type: "bond" })).toThrow();
  });

  it("search_asset vindt assets op naam", async () => {
    const res = await tools().call("search_asset", { query: "bitcoin" });
    expect(res[0]).toMatchObject({ symbol: "BTC", type: "crypto" });
  });

  it("get_opportunities filtert op termijn en soort", async () => {
    const res = await tools().call("get_opportunities", { horizon: "long", type: "crypto" });
    expect(res.geanalyseerd).toBeGreaterThan(30);
    for (const k of res.kansen) expect(k.type).toBe("crypto");
  });

  it("get_my_portfolio geeft per positie het verkoopadvies van de app", async () => {
    const res = await tools([
      { symbol: "BTC", name: "Bitcoin", type: "crypto", quantity: 0.1, buyPrice: 1_000_000, buyDate: "2026-01-01", currency: "USD", stopLoss: 900_000, horizon: "short" },
    ]).call("get_my_portfolio", {});
    expect(res.posities[0]).toMatchObject({ symbol: "BTC", advies: "Verkopen" });
    expect(res.posities[0].reden).toMatch(/Stop-loss/);
    const empty = await tools([]).call("get_my_portfolio", {});
    expect(empty.posities).toEqual([]);
  });

  it("de samenvatting voor het model is compact", async () => {
    const json = JSON.stringify(analysisForModel(await analyzeAsset("ETH", "crypto")));
    expect(json.length).toBeLessThan(12_000); // ± 3k tokens
  });
});

describe("Daglimieten", () => {
  it("blokkeert na het maximum per gebruiker", async () => {
    const { PER_USER_DAILY } = await import("@/lib/chat/limits");
    const key = `test-${Date.now()}`;
    for (let i = 0; i < PER_USER_DAILY; i++) expect((await consumeChatQuota(key)).ok).toBe(true);
    const last = await consumeChatQuota(key);
    expect(last.ok).toBe(false);
  });
});

describe("Chat-route", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });
  const post = async (body: unknown, headers: Record<string, string> = {}) => {
    const { POST } = await import("@/app/api/chat/route");
    return POST(
      new NextRequest("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
        body: JSON.stringify(body),
      }),
    );
  };
  const ok = { messages: [{ role: "user", content: "Is Bitcoin een goede koop?" }] };

  it("meldt 503 zonder API-sleutel", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect((await post(ok)).status).toBe(503);
    const { GET } = await import("@/app/api/chat/route");
    expect(await (await GET()).json()).toEqual({ enabled: false, requiresCode: false });
  });

  it("vraagt een toegangscode als die is ingesteld", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.CHAT_ACCESS_CODE = "geheim";
    expect((await post(ok)).status).toBe(401);
    expect((await post(ok, { "x-chat-code": "fout" })).status).toBe(401);
  });

  it("weigert ongeldige gesprekken", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    delete process.env.CHAT_ACCESS_CODE;
    delete process.env.DATABASE_URL;
    expect((await post({ messages: [] })).status).toBe(400);
    expect((await post({ messages: [{ role: "assistant", content: "hoi" }] })).status).toBe(400);
    expect((await post({ messages: [{ role: "user", content: "x".repeat(5000) }] })).status).toBe(400);
  });
});
