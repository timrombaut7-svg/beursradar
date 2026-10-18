import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, appPassword, isValidSession } from "@/lib/auth";

/** Paden die zonder inloggen bereikbaar moeten zijn (de inlogpagina zelf en het app-icoon). */
const PUBLIC = ["/login", "/api/login", "/icon.svg", "/favicon.ico"];

/** Alleen de eigenaar mag de app gebruiken: alles achter een wachtwoord (als APP_PASSWORD is ingesteld). */
export async function proxy(request: NextRequest) {
  const password = appPassword();
  if (!password) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  if (await isValidSession(request.cookies.get(AUTH_COOKIE)?.value, password)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Niet voor statische bestanden van Next zelf (JS, CSS, afbeeldingen)
  matcher: ["/((?!_next/static|_next/image).*)"],
};
