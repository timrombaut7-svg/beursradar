import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { POST as login } from "@/app/api/login/route";
import { AUTH_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

const req = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost"), { headers: cookie ? { Cookie: `${AUTH_COOKIE}=${cookie}` } : {} });

const loginReq = (password: unknown) =>
  new NextRequest(new URL("/api/login", "http://localhost"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

afterEach(() => {
  delete process.env.APP_PASSWORD;
});

describe("Wachtwoordslot", () => {
  it("laat alles door zolang er geen wachtwoord is ingesteld", async () => {
    const res = await proxy(req("/kansen"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("stuurt bezoekers zonder sessie naar de inlogpagina en blokkeert de API", async () => {
    process.env.APP_PASSWORD = "geheim-123";
    const page = await proxy(req("/kansen?x=1"));
    expect(page.status).toBe(307);
    expect(new URL(page.headers.get("location")!).pathname).toBe("/login");
    expect(new URL(page.headers.get("location")!).searchParams.get("next")).toBe("/kansen?x=1");

    const api = await proxy(req("/api/scan"));
    expect(api.status).toBe(401);

    // Een verzonnen of oude cookie helpt niet
    expect((await proxy(req("/api/scan", "abc"))).status).toBe(401);
    expect((await proxy(req("/api/scan", await sessionToken("oud-wachtwoord")))).status).toBe(401);

    // De inlogpagina en het app-icoon blijven bereikbaar
    for (const p of ["/login", "/api/login", "/icon.svg"]) {
      expect((await proxy(req(p))).headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("laat de eigenaar binnen na inloggen met het juiste wachtwoord", async () => {
    process.env.APP_PASSWORD = "geheim-123";
    const wrong = await login(loginReq("fout"));
    expect(wrong.status).toBe(401);
    expect(wrong.cookies.get(AUTH_COOKIE)).toBeUndefined();

    const ok = await login(loginReq("geheim-123"));
    expect(ok.status).toBe(200);
    const cookie = ok.cookies.get(AUTH_COOKIE)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.maxAge).toBeGreaterThan(30 * 86400);

    const res = await proxy(req("/api/scan", cookie.value));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("vergelijkt in constante tijd en correct", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
