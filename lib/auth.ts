/**
 * Eenvoudig wachtwoordslot voor de hele app (één gebruiker). Het wachtwoord staat in de
 * omgevingsvariabele APP_PASSWORD; zonder die variabele is de app open.
 * De sessiecookie bevat een HMAC van het wachtwoord, zodat een nieuw wachtwoord
 * automatisch alle bestaande sessies ongeldig maakt.
 */

export const AUTH_COOKIE = "br_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365; // een jaar ingelogd blijven op je eigen telefoon

export function appPassword(): string | null {
  return process.env.APP_PASSWORD || null;
}

/** Sessietoken dat bij dit wachtwoord hoort (Web Crypto, werkt in elke runtime). */
export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("beursradar-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Vergelijking in constante tijd, zodat de looptijd niets verraadt over het juiste antwoord. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function isValidSession(cookie: string | undefined, password: string): Promise<boolean> {
  if (!cookie) return false;
  return safeEqual(cookie, await sessionToken(password));
}
