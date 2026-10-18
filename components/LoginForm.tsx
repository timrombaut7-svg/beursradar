"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Verkeerd wachtwoord." : "Inloggen lukt nu niet, probeer het opnieuw.");
        return;
      }
      // Alleen terug naar een pagina binnen de app
      const next = params.get("next");
      window.location.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch {
      setError("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <form onSubmit={submit} className="card-surface space-y-4 rounded-2xl border border-border/80 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-bull to-accent text-black">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Beurs<span className="text-gradient">radar</span>
            </h1>
            <p className="text-xs text-muted">Privé: alleen voor de eigenaar</p>
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Lock className="h-3.5 w-3.5" /> Wachtwoord
          </span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-panel-2 px-3 text-base outline-none focus:border-accent"
          />
        </label>
        {error && <p className="text-sm text-bear">{error}</p>}
        <Button type="submit" variant="bull" className="h-11 w-full" disabled={busy || !password}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inloggen"}
        </Button>
        <p className="text-[11px] text-muted">Je blijft op dit toestel een jaar ingelogd.</p>
      </form>
    </div>
  );
}
