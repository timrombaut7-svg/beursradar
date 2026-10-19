"use client";
import { useState } from "react";
import { Cloud, Loader2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAccount } from "@/lib/hooks";
import { useWatchlist } from "@/lib/store/watchlist";
import { usePortfolio } from "@/lib/store/portfolio";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const input =
  "h-11 w-full rounded-xl border border-border bg-panel-2 px-3 text-base outline-none focus:border-accent";

export function AccountView() {
  const { data, isLoading } = useAccount();
  if (isLoading || !data) return <Skeleton className="h-80" />;
  if (!data.enabled) {
    return (
      <Card>
        <CardBody className="text-sm text-muted">Accounts zijn alleen beschikbaar als de app een database heeft.</CardBody>
      </Card>
    );
  }
  return data.user ? <LoggedIn user={data.user} /> : <AuthForm />;
}

function LoggedIn({ user }: { user: { username: string; watchlist: number; positions: number } }) {
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    await fetch("/api/account/logout", { method: "POST" }).catch(() => null);
    // Niets van het account op dit toestel laten staan
    useWatchlist.getState().replace([]);
    usePortfolio.getState().replace([]);
    // Volledig herladen zodat de synchronisatie opnieuw begint met een leeg, anoniem profiel
    window.location.replace("/");
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-bull to-accent text-2xl font-bold uppercase text-black">
            {user.username.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">Ingelogd als</p>
            <p className="truncate text-xl font-bold">{user.username}</p>
            <p className="text-xs text-muted">
              {user.positions} {user.positions === 1 ? "positie" : "posities"} · {user.watchlist} op je watchlist
            </p>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="space-y-2 text-sm">
          <p className="flex items-start gap-2">
            <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            Je portfolio, je aankopen met hun verkoopplan en je watchlist staan veilig in je account. Log op een ander
            toestel in met dezelfde gebruikersnaam en je ziet alles terug.
          </p>
          <p className="flex items-start gap-2 text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-bull" />
            Je wachtwoord wordt alleen versleuteld bewaard; niemand kan het terugzien, ook wij niet.
          </p>
        </CardBody>
      </Card>
      <Button variant="outline" className="h-11 w-full" onClick={logout} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Uitloggen
      </Button>
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password !== repeat) return setError("De twee wachtwoorden zijn niet hetzelfde.");
    setBusy(true);
    try {
      const res = await fetch(`/api/account/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setError(body.error ?? "Er ging iets mis. Probeer het opnieuw.");
      // Opnieuw laden: portfolio en watchlist komen dan uit je account
      window.location.replace("/portfolio");
    } catch {
      setError("Geen verbinding. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1" role="tablist">
          {(
            [
              ["login", "Inloggen"],
              ["register", "Account maken"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn("rounded-lg py-2 text-sm font-medium", mode === m ? "bg-panel text-text shadow-sm" : "text-muted")}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <UserRound className="h-3.5 w-3.5" /> Gebruikersnaam
            </span>
            <input
              className={input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
            {mode === "register" && <span className="text-[11px] text-muted">3 tot 30 tekens: letters, cijfers, punt, - of _</span>}
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Wachtwoord</span>
            <input
              className={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
            {mode === "register" && <span className="text-[11px] text-muted">Minstens 8 tekens. Een zin van een paar woorden is sterk én makkelijk te onthouden.</span>}
          </label>
          {mode === "register" && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Herhaal wachtwoord</span>
              <input className={input} type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required />
            </label>
          )}
          {error && <p className="text-sm text-bear">{error}</p>}
          <Button type="submit" variant="bull" className="h-11 w-full" disabled={busy || !username || !password}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Inloggen" : "Account maken"}
          </Button>
        </form>

        <p className="text-[11px] leading-relaxed text-muted">
          {mode === "register"
            ? "Wat je nu al op dit toestel bewaard hebt (portfolio en watchlist), gaat mee naar je nieuwe account."
            : "Wat je zonder account op dit toestel bewaard hebt, wordt bij het inloggen aan je account toegevoegd."}{" "}
          Er is geen e-mail nodig, maar daardoor kan een vergeten wachtwoord ook niet hersteld worden: bewaar het goed.
        </p>
      </CardBody>
    </Card>
  );
}
