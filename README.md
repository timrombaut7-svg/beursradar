# Beursradar — Multi-asset analyse & AI-tradingplatform

Next.js-applicatie (App Router, TypeScript) die aandelen en crypto analyseert langs **4 pijlers**
(fundamenteel, technisch, sentiment/macro, risico), dat combineert in een **transparante
beslissingsmatrix** met een concreet **trade-executieplan**, en het algoritme **backtest** over de
afgelopen 12 maanden.

> Geen financieel advies. Beursradar is een analyse- en leertool.

## Snel starten

```bash
npm install
cp .env.example .env.local   # optioneel: sleutels en database
npm run db:migrate           # alleen als je DATABASE_URL gebruikt
npm run dev                  # http://localhost:3000
npm test             # unit/integratietests (Vitest); DB-tests draaien met TEST_DATABASE_URL
npm run typecheck && npm run lint && npm run build
```

Alle API-keys zijn optioneel — zie `.env.example`. Zonder keys gebruikt de app publieke endpoints en
valt automatisch terug op realistische mock-data. `USE_MOCK_DATA=1` forceert volledig offline gebruik.

## Architectuur

```
app/
  page.tsx                     Dashboard: Fear & Greed, macro, markten, watchlist
  asset/[type]/[symbol]/       4-pijler analysepagina
  portfolio/                   Portfolio-simulator (PnL, risicospreiding)
  api/
    analysis/[type]/[symbol]   Volledige analyse (pijlers, signaal, plan, backtest)
    candles/[type]/[symbol]    OHLCV + indicator-overlays per tijdsframe (1H/1D/1W/1M/1Y)
    quotes, market, search     Koersen, marktoverzicht, autocomplete
    ai-summary                 Optionele Claude-samenvatting (ANTHROPIC_API_KEY)
    watchlist, portfolio, sync Opslag in de database (Prisma)
lib/
  indicators/                  Pure wiskunde: SMA/EMA, RSI (Wilder), MACD, Bollinger + squeeze,
                               ATR, crossovers (golden/death), pivots, swing S/R, Fibonacci,
                               volatiliteit, beta, max drawdown, VaR, Sharpe
  api/                         Databronnen + caching, circuit breaker en mock-fallbacks
  engine/                      technical.ts · scoring.ts (beslissingsmatrix) · tradePlan.ts ·
                               backtest.ts · analyze.ts (orchestrator)
  nlp/sentiment.ts             Financieel keyword-lexicon met negaties → bullish/bearish/neutraal
  store/                       Zustand (watchlist, portfolio, UI) + server-sync
  db.ts, server/               Prisma-client, anoniem profiel (cookie), zod-validatie
prisma/                        schema.prisma + migraties
components/                    UI (Tailwind 4, Radix, Framer Motion, lightweight-charts, Recharts)
tests/                         Vitest
```

### Databronnen & fallbacks

| Data | Primair | Fallback |
|---|---|---|
| Crypto-koersen | Binance klines → CoinGecko `market_chart` | mock (verankerd aan laatst bekende live prijs) |
| Crypto-fundamentals | CoinGecko `/coins/{id}` | mock |
| Aandelen (koers, P/E, PEG, EPS, groei, D/E, FCF, dividend, analisten) | Yahoo Finance via `yahoo-finance2` | mock |
| Crypto Fear & Greed | alternative.me | mock |
| Aandelen Fear & Greed | CNN dataviz-endpoint | eigen proxy uit S&P 500 (momentum, RSI, volatiliteit) |
| Nieuws | Yahoo RSS (aandelen), CoinDesk/Cointelegraph/Decrypt RSS (crypto) | mock-koppen |
| Macro | FRED (rente, CPI, 10j) met `FRED_API_KEY`; CoinGecko `/global` (BTC-dominantie) | indicatieve waarden |

Elke response vermeldt per bron of de data `live`, `derived` of `mock` is; de UI toont dat als badges.
Een **onbekend** symbool zonder live data geeft een 404 in plaats van een verzonnen analyse.
Responses worden server-side gecachet (TTL per bron) en een host die 429/5xx geeft wordt tijdelijk
overgeslagen; client-side cachet TanStack Query.

**Benaderingen (eerlijk vermeld):** de MVRV Z-score is een proxy (365-daags gemiddelde als
"gerealiseerde prijs"), netwerkactiviteit (actieve adressen) is geschat omdat on-chain data betaalde
API's vereist, en supply-inflatie komt uit een indicatieve tabel.

### Beslissingsmatrix

Elke factor kent punten toe binnen ±max (bijv. RSI < 30 → +2, Death Cross → −3, omzetgroei > 20% → +2).
Per pijler wordt de som genormaliseerd naar −100…+100; de eindscore is een gewogen gemiddelde:

| Horizon | Technisch | Sentiment | Risico | Fundamenteel |
|---|---|---|---|---|
| Korte termijn (1–4 weken) | 50% | 25% | 15% | 10% |
| Lange termijn (1–5 jaar) | 20% | 10% | 25% | 45% |

Advies: ≥ 45 STERK KOOP · ≥ 15 KOOP · > −15 HOUDEN · > −45 VERKOOP · anders STERK VERKOOP.
Betrouwbaarheid = eensgezindheid van de pijlers × signaalsterkte × aandeel live data.

**Executieplan:** instapzone rond de dichtstbijzijnde support (binnen 4×ATR), stop-loss 1×ATR onder
die support, target 1/2 op de eerstvolgende resistance-/Fibonacci-niveaus met minimaal 1:1 resp. 1:2
risk/reward. Shorts worden berekend door het prijsvlak te spiegelen.

**Backtest:** walk-forward over 252 (aandelen) / 365 (crypto) bars met uitsluitend het technische deel
(fundamentals/sentiment zijn historisch niet beschikbaar). Instap bij TA-score ≥ +20, uitstap ≤ −10
of 2×ATR stop, uitvoering op de open van de volgende bar, 0,1% kosten per kant.

## Opslag (Prisma + PostgreSQL)

Watchlist en portfolio worden opgeslagen in **PostgreSQL** via **Prisma 7** (`@prisma/adapter-pg`).
Zonder `DATABASE_URL` werkt alles gewoon in LocalStorage.

```bash
# .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beursradar"

npm run db:migrate       # migraties toepassen (prisma migrate deploy)
npm run db:migrate:dev   # nieuwe migratie maken na een schemawijziging
npm run db:studio        # data bekijken in Prisma Studio
```

- **Geen login nodig:** elke browser krijgt een anoniem profiel via een httpOnly-cookie (`br_profile`).
  Data van verschillende browsers is gescheiden; wie de cookie wist, begint met een nieuw profiel.
- **Sync:** de Zustand-stores blijven de snelle lokale cache; wijzigingen gaan optimistisch naar
  `/api/watchlist` en `/api/portfolio`. Mislukt een request, dan wordt de lijst opnieuw van de
  server geladen. Bestaande LocalStorage-data wordt bij de eerste keer eenmalig geïmporteerd (`/api/sync`).
- **Zonder database** geven de API's een 503 en blijft de app in LocalStorage-modus. De UI toont
  steeds waar de data staat ("opgeslagen in de database" / "in je browser").
- **Tests:** `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm test` maakt
  per run een tijdelijke database aan en ruimt die op. In CI draait hiervoor een Postgres-service.

## Online zetten (Vercel)

1. Log in op [vercel.com](https://vercel.com) met GitHub → **Add New → Project** → kies deze repository → **Deploy**.
2. Optioneel, voor opslag in een database: in het Vercel-project → **Storage** → **Create Database** →
   **Neon (Postgres)** → koppel aan het project en klik daarna op **Redeploy**.
   Vercel zet `DATABASE_URL` automatisch; de build (`vercel-build`) past dan de migraties toe.
3. Elke push naar `main` wordt automatisch online gezet.
