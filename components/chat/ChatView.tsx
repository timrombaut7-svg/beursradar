"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Loader2, Lock, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useChat, type ChatMessage } from "@/lib/store/chat";
import { usePortfolio } from "@/lib/store/portfolio";
import { useHydrated } from "@/lib/useHydrated";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";

const SUGGESTIONS = [
  "Wat kan ik nu het beste kopen voor de lange termijn?",
  "Denk je dat NVIDIA de komende weken gaat dalen?",
  "Is Bitcoin nu een goede koop?",
  "Moet ik iets verkopen uit mijn portfolio?",
];

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

export function ChatView() {
  const hydrated = useHydrated();
  const { messages, add, update, appendText, clear, accessCode, setAccessCode } = useChat();
  const positions = usePortfolio((s) => s.positions);
  const params = useSearchParams();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prefilled = useRef(false);

  const { data: info } = useQuery({
    queryKey: ["chat-info"],
    queryFn: async () => (await fetch("/api/chat")).json() as Promise<{ enabled: boolean; requiresCode: boolean }>,
    staleTime: 5 * 60_000,
  });

  // Vraag vanaf een analysepagina (?vraag=...) vooraf invullen
  useEffect(() => {
    const q = params.get("vraag");
    if (q && !prefilled.current) {
      prefilled.current = true;
      setInput(q);
    }
  }, [params]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const reply: ChatMessage = { id: newId(), role: "assistant", content: "" };
    const history = [...messages.filter((m) => !m.error && m.content), userMsg].slice(-12);
    add(userMsg);
    add(reply);
    setBusy(true);
    setStatus("Even nadenken…");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessCode ? { "x-chat-code": accessCode } : {}) },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          positions: positions.map(({ symbol, name, type, quantity, buyPrice, buyDate, currency, stopLoss, target1, target2, horizon }) => ({
            symbol, name, type, quantity, buyPrice, buyDate, currency, stopLoss, target1, target2, horizon,
          })),
        }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (err.code === "access_code") {
          setAccessCode("");
          setCodeError(true);
        }
        update(reply.id, { content: err.error ?? `Er ging iets mis (${res.status}).`, error: true });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { type: string; delta?: string; text?: string; message?: string; remaining?: number };
          if (ev.type === "text" && ev.delta) {
            setStatus(null);
            appendText(reply.id, ev.delta);
          } else if (ev.type === "status" && ev.text) setStatus(ev.text);
          else if (ev.type === "error") update(reply.id, { content: ev.message ?? "Er ging iets mis.", error: true });
          else if (ev.type === "done" && typeof ev.remaining === "number") setRemaining(ev.remaining);
        }
      }
    } catch {
      update(reply.id, { content: "Geen verbinding. Controleer je internet en probeer het opnieuw.", error: true });
    } finally {
      setBusy(false);
      setStatus(null);
    }
  };

  if (!hydrated || !info) {
    return (
      <Card className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </Card>
    );
  }

  if (!info.enabled) {
    return (
      <Card className="space-y-2 p-6 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-accent" /> De AI-assistent is nog niet ingesteld
        </p>
        <p className="text-muted">
          De eigenaar van deze site moet een Anthropic API-sleutel toevoegen als <code>ANTHROPIC_API_KEY</code> in Vercel
          (Settings → Environment Variables) en daarna opnieuw deployen.
        </p>
      </Card>
    );
  }

  if (info.requiresCode && !accessCode) {
    return (
      <Card className="mx-auto max-w-sm space-y-3 p-6">
        <p className="flex items-center gap-2 font-semibold">
          <Lock className="h-4 w-4" /> Toegangscode
        </p>
        <p className="text-sm text-muted">De AI-assistent is beveiligd. Vul de toegangscode in.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCodeError(false);
            setAccessCode(codeInput.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-border bg-panel-2 px-3 text-sm outline-none focus:border-accent/60"
            aria-label="Toegangscode"
          />
          <Button type="submit" variant="primary">
            Ok
          </Button>
        </form>
        {codeError && <p className="text-xs text-bear">Die code klopt niet.</p>}
      </Card>
    );
  }

  return (
    <Card className="flex h-[calc(100dvh-11rem)] min-h-[420px] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg space-y-4 py-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-accent" />
            <p className="text-sm text-muted">
              Stel een vraag over een aandeel, crypto of je portfolio. De assistent gebruikt de live analyses van Beursradar.
            </p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-left text-sm hover:border-accent/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          return (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
              <span
                className={cn(
                  "mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                  m.role === "user" ? "bg-accent/15 text-accent" : "bg-bull/15 text-bull",
                )}
                aria-hidden
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  m.role === "user" ? "bg-accent/15" : "bg-panel-2",
                  m.error && "border border-bear/40 text-bear",
                )}
              >
                {m.content ? (
                  m.role === "assistant" ? <Markdown text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>
                ) : isLast && busy ? (
                  <span className="flex items-center gap-2 text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> {status ?? "Even nadenken…"}
                  </span>
                ) : null}
                {m.content && isLast && busy && status && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" /> {status}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        {messages.length > 0 && (
          <Button type="button" size="icon" variant="ghost" onClick={clear} disabled={busy} aria-label="Nieuw gesprek" title="Nieuw gesprek">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Stel je vraag…"
          className="max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent/60"
          aria-label="Je vraag"
        />
        <Button type="submit" variant="primary" size="icon" disabled={busy || !input.trim()} aria-label="Verstuur">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      <p className="px-3 pb-2 text-center text-[10px] text-muted">
        De AI kan fouten maken en geeft geen financieel advies.{remaining !== null ? ` Nog ${remaining} vragen vandaag.` : ""}
      </p>
    </Card>
  );
}
