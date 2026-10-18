import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { dbEnabled } from "@/lib/db";
import { resolveProfile, withProfileCookie } from "@/lib/server/profile";
import { buildChatTools, chatPositionSchema } from "@/lib/chat/tools";
import { consumeChatQuota } from "@/lib/chat/limits";
import { answerLocally } from "@/lib/chat/local";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-opus-5-5";

const SYSTEM = `Je bent de AI-assistent van Beursradar, een app die aandelen, ETF's en crypto analyseert.
Je praat met een particuliere belegger zonder financiële opleiding. Antwoord altijd in eenvoudig Nederlands, kort en duidelijk.

Zo werk je:
- Gebruik voor elke vraag over een aandeel, crypto, kansen, de markt of het portfolio van de gebruiker eerst de tools. Ze geven de actuele data en analyses van de app. Noem nooit koersen, scores of nieuws die niet uit een tool komen.
- Weet je het symbool niet zeker, gebruik dan eerst search_asset.
- Niemand kan de toekomst voorspellen. Op "gaat dit dalen?" of "moet ik dit kopen?" geef je een eerlijke inschatting op basis van de signalen: wat wijst omhoog, wat wijst omlaag, en wat het signaal van de app is (korte en lange termijn). Spreek in kansen en scenario's, nooit in zekerheden.
- Raad iets alleen aan als "historischeToets.<termijn>.aangeraden" true is: dan werkte hetzelfde signaal in het verleden aantoonbaar op deze asset. Is het signaal "kopen" maar aangeraden false, zeg dan eerlijk dat de app het toch niet aanraadt en waarom.
- Noem bij een koopvraag ook het plan uit de app: rond welke prijs kopen, onder welke prijs verkopen (stop-loss), en hoe lang ongeveer houden, plus in één zin het bewijs uit de historische toets.
- Leg vaktermen uit of vermijd ze. Gebruik korte alinea's of opsommingen. Houd het antwoord meestal onder de 200 woorden.
- Is data niet live (bron "mock"), zeg dat er dan bij en wees voorzichtig.
- Je bent geen financieel adviseur. Sluit een advies af met één korte zin dat het geen financieel advies is en dat de gebruiker alleen geld moet beleggen dat hij kan missen. Zeg dat niet bij gewone informatievragen.
- Vragen die niets met beleggen of deze app te maken hebben, beantwoord je kort of verwijs je vriendelijk terug naar beleggen.`;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((m) => m[m.length - 1].role === "user", "laatste bericht moet van de gebruiker zijn"),
  positions: z.array(chatPositionSchema).max(50).default([]),
});

function codeMatches(given: string | null, expected: string) {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * GET: welke assistent draait er? Zonder ANTHROPIC_API_KEY de gratis ingebouwde
 * assistent ("basis"), met sleutel Claude ("ai"). Alleen "ai" kan een code vereisen.
 */
export async function GET() {
  const mode = aiEnabled() ? "ai" : "basis";
  return NextResponse.json({ enabled: true, mode, requiresCode: mode === "ai" && Boolean(process.env.CHAT_ACCESS_CODE) });
}

const ndjsonHeaders = { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" };

/** Gratis modus: antwoord uit de eigen analyses, zonder AI-dienst, limieten of kosten. */
function localResponse(body: z.infer<typeof bodySchema>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const question = body.messages[body.messages.length - 1].content;
        const history = body.messages.slice(0, -1).filter((m) => m.role === "user").map((m) => m.content);
        const answer = await answerLocally(question, history, body.positions, (text) => send({ type: "status", text }));
        // In stukjes versturen zodat het antwoord net als bij de AI binnenloopt
        for (const part of answer.match(/[\s\S]{1,40}(\s|$)/g) ?? [answer]) send({ type: "text", delta: part });
        send({ type: "done" });
      } catch (err) {
        console.error("[beursradar] fout in basis-assistent:", err);
        send({ type: "error", message: "Er ging iets mis. Probeer het opnieuw." });
      } finally {
        controller.close();
      }
    },
  });
  return new NextResponse(stream, { headers: ndjsonHeaders });
}

/**
 * POST: stelt een vraag aan de assistent. Antwoord is een stream met één JSON-object per regel:
 *   {"type":"status","text":"Analyse van NVDA ophalen…"}
 *   {"type":"text","delta":"…"}
 *   {"type":"done","remaining":12} | {"type":"error","message":"…"}
 */
export async function POST(req: NextRequest) {
  const requiredCode = process.env.CHAT_ACCESS_CODE;
  if (aiEnabled() && requiredCode && !codeMatches(req.headers.get("x-chat-code"), requiredCode)) {
    return NextResponse.json({ error: "Onjuiste toegangscode.", code: "access_code" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!aiEnabled()) return localResponse(body);

  // Wie stelt de vraag? Met database: het anonieme profiel; anders het IP-adres.
  let profile: { id: string; isNew: boolean } | null = null;
  let userKey: string;
  if (dbEnabled()) {
    profile = await resolveProfile(req);
    userKey = profile.id;
  } else {
    userKey = `ip:${req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "onbekend"}`;
  }
  const quota = await consumeChatQuota(userKey);
  if (!quota.ok) return NextResponse.json({ error: quota.reason, code: "limit" }, { status: 429 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const tools = buildChatTools({ positions: body.positions, report: (text) => send({ type: "status", text }) }).map(
        // Tool-invoer streamt direct; betaZodTool valideert die vóór het uitvoeren
        (t) => ({ ...t, eager_input_streaming: true }),
      );
      const today = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

      try {
        const client = new Anthropic();
        const runner = client.beta.messages.toolRunner(
          {
            model: MODEL,
            max_tokens: 16000,
            max_iterations: 8,
            stream: true,
            // Chat: snelle antwoorden; de analyses zelf komen uit de tools
            output_config: { effort: "low" },
            // Bij een weigering door de veiligheidsfilters automatisch een ander model laten antwoorden
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            system: `${SYSTEM}\n\nVandaag is het ${today}.`,
            tools,
            messages: body.messages,
          },
          { signal: req.signal },
        );

        let wroteText = false;
        let needsBreak = false;
        for await (const messageStream of runner) {
          messageStream.on("text", (delta) => {
            if (needsBreak && wroteText) send({ type: "text", delta: "\n\n" });
            needsBreak = false;
            wroteText = true;
            send({ type: "text", delta });
          });
          const message = await messageStream.finalMessage();
          if (message.stop_reason === "refusal") {
            send({ type: "error", message: "Op deze vraag kan ik geen antwoord geven. Probeer het anders te formuleren." });
            break;
          }
          needsBreak = true;
        }
        send({ type: "done", remaining: quota.remaining });
      } catch (err) {
        if (req.signal.aborted) {
          // De gebruiker heeft de pagina verlaten: niets meer te sturen
        } else if (err instanceof Anthropic.AuthenticationError) {
          send({ type: "error", message: "De API-sleutel van de assistent is ongeldig." });
        } else if (err instanceof Anthropic.RateLimitError) {
          send({ type: "error", message: "Het is even te druk. Probeer het over een minuut opnieuw." });
        } else if (err instanceof Anthropic.APIError) {
          send({ type: "error", message: `De AI-dienst gaf een fout (${err.status}). Probeer het later opnieuw.` });
        } else {
          console.error("[beursradar] chatfout:", err);
          send({ type: "error", message: "Er ging iets mis. Probeer het opnieuw." });
        }
      } finally {
        controller.close();
      }
    },
  });

  const res = new NextResponse(stream, { headers: ndjsonHeaders });
  return profile ? withProfileCookie(res, profile) : res;
}
