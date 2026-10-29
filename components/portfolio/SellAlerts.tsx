"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const base64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function registration() {
  return navigator.serviceWorker.register("/sw.js");
}

/** Pushmelding op je telefoon zodra een positie verkocht moet worden (of deels winst nemen). */
export function SellAlerts() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // Op de iPhone werken meldingen alleen in de app op het beginscherm
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await registration();
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return setState("off");
        const res = await fetch(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`);
        const json = (await res.json()) as { subscribed?: boolean };
        setState(json.subscribed ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const { publicKey } = (await (await fetch("/api/push")).json()) as { publicKey: string };
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) }));
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error("opslaan mislukt");
      setState("on");
      await fetch("/api/push/test", { method: "POST" });
      setMessage("Gelukt! Je krijgt zo een testmelding.");
    } catch (err) {
      setMessage(`Aanzetten lukte niet: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
      setMessage(null);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    const res = await fetch("/api/push/test", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { sent?: number };
    setMessage(json.sent ? "Testmelding verstuurd." : "Er kon geen melding verstuurd worden. Zet de meldingen opnieuw aan.");
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader
        icon={<Bell className="h-4 w-4" />}
        title="Verkoopmeldingen"
        subtitle="Krijg een bericht op je telefoon zodra je iets uit je portfolio moet verkopen of winst kunt nemen."
      />
      <CardBody className="space-y-2 text-sm">
        {state === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        {state === "ios-install" && (
          <p>
            Op de iPhone werken meldingen alleen als Beursradar op je beginscherm staat: tik in Safari op <strong>Deel</strong> →{" "}
            <strong>Zet op beginscherm</strong>, open de app vanaf je beginscherm en kom hier terug.
          </p>
        )}
        {state === "unsupported" && <p className="text-muted">Deze browser ondersteunt geen meldingen. Probeer Chrome, of de app op je beginscherm.</p>}
        {state === "denied" && (
          <p className="text-hold">
            Meldingen zijn geblokkeerd. Sta ze toe in de instellingen van je browser of telefoon (Meldingen → Beursradar) en laad de pagina opnieuw.
          </p>
        )}
        {state === "off" && (
          <Button variant="primary" onClick={enable} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Zet meldingen aan
          </Button>
        )}
        {state === "on" && (
          <div className="space-y-2">
            <p className="text-bull">Meldingen staan aan op dit toestel. We kijken elk half uur naar je posities.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={test} disabled={busy}>
                <BellRing className="h-4 w-4" /> Stuur testmelding
              </Button>
              <Button variant="ghost" onClick={disable} disabled={busy}>
                <BellOff className="h-4 w-4" /> Uitzetten
              </Button>
            </div>
          </div>
        )}
        {message && <p className="text-xs text-muted">{message}</p>}
      </CardBody>
    </Card>
  );
}
