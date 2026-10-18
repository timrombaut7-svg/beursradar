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
npm test             # 143 unit/integratietests (Vitest); DB-tests draaien met TEST_DATABASE_URL
npm run typecheck && npm run lint && npm run build
```

Alle API-keys zijn optioneel — zie `.env.example`. Zonder keys gebruikt de app publieke endpoints en
valt automatisch terug op realistische mock-data. `USE_MOCK_DATA=1` forceert volledig offline gebruik.

## Architectuur

```
app/
  page.tsx                     Dashboard: Fear & Greed, macro, markten, watchlist
  asset/[type]/[symbol]/       4-pijler analysepagina
  portfolio/                   Portfolio-simulator (PnL, risicospreiding, verkoopadvies)
  kansen/                      Koopkansen uit de hele catalogus + verkoopadvies per positie
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

**Live data:** `/api/prices` haalt in één batch alle aandelen (Yahoo) en alle crypto (CoinGecko) op, 15 s gecachet
(plus 10 s CDN-cache, dus weinig API-calls bij veel bezoekers). De live koers wordt in de laatste dagcandle verwerkt,
zodat indicatoren en signalen er meteen op reageren; analyses en de scan worden elke minuut herberekend. De UI
ververst koersen elke 15 s (met beursstatus open/gesloten) en signalen elke minuut. Europese beurzen kunnen via Yahoo
tot 15 min vertraagd zijn; buiten openingstijden verandert een aandeelkoers niet.

**Uitleg & houdtermijn:** elke kans krijgt uitleg in makkelijke taal zonder vaktermen (waarom kopen, waar op letten,
het plan, hoe lang houden). Elke zin hoort bij een factor uit de beslissingsmatrix (`lib/engine/explain.ts`).
Korte termijn: houdtermijn geschat als afstand tot de koersdoelen ÷ (0,35 × gemiddelde dagbeweging), begrensd op
3–40 handelsdagen. Lange termijn: kopen bij een positief lange-termijnsignaal (niet als het korte-termijnsignaal op
verkopen staat), ruime noodrem-stop (1,5 × verwachte 3-maandsbeweging, 12–40%), geen vaste koersdoelen; verkoopadvies
volgt dan het lange-termijnsignaal.

**Alleen echte data in de score:** fundamentals, nieuws en Fear & Greed tellen alleen mee als ze live zijn; geschatte
netwerkactiviteit van crypto telt nooit mee (behalve in demo-modus met `USE_MOCK_DATA=1`). Crypto-koersen komen van
`data-api.binance.vision` (niet geo-geblokkeerd), met Coinbase en CoinGecko als reserve.

**Kansen & verkoopadvies:** `/api/scan` analyseert de hele catalogus (max. 4 tegelijk, 1 min cache) en
toont assets met KOOP/STERK KOOP op korte termijn én een long-plan; assets met alleen mock-koersen worden
nooit aangeraden. Met **Gekocht** wordt de positie opgeslagen inclusief stop-loss en koersdoelen van dat
moment. Verkoopadvies per positie: stop-loss geraakt → verkopen; koersdoel 2 → verkopen; signaal omgeslagen
naar (sterk) verkopen → verkopen; koersdoel 1 → deels winst nemen en stop naar instapprijs; anders houden.

**Backtest:** walk-forward over 252 (aandelen) / 365 (crypto) bars met uitsluitend het technische deel
(fundamentals/sentiment zijn historisch niet beschikbaar). Instap bij TA-score ≥ +20, uitstap ≤ −10
of 2×ATR stop, uitvoering op de open van de volgende bar, 0,1% kosten per kant.

## AI-assistent

Op `/assistent` (en via **Vraag de AI** op elke analysepagina) kun je vragen stellen als *"denk je dat NVIDIA gaat
dalen?"* of *"moet ik iets verkopen?"*.

**Gratis basis-assistent (standaard).** Zonder `ANTHROPIC_API_KEY` beantwoordt een ingebouwde assistent de vragen,
zonder AI-dienst, kosten of limieten (`lib/chat/local.ts`). Hij herkent het asset (naam of ticker, ook in
vervolgvragen), wat je wilt weten (dalen/stijgen, kopen, verkopen, kansen, portfolio, markt) en de termijn, en bouwt
het antwoord uit de live analyses in dezelfde makkelijke taal als de Kansen-pagina.

**Met AI (optioneel, betaald).** Met `ANTHROPIC_API_KEY` neemt Claude het over (`claude-opus-5-5`, effort `low`, met automatische
fallback bij een weigering) en gebruikt via tools de echte data van de app: `search_asset`, `get_analysis`,
`get_opportunities`, `get_my_portfolio` en `get_market_overview` (`lib/chat/tools.ts`). Antwoorden streamen naar de
browser (`/api/chat`, NDJSON).

- Aanzetten: `ANTHROPIC_API_KEY` instellen (Vercel → Settings → Environment Variables) en opnieuw deployen.
- Kosten: ± $0,05 per vraag. Daglimieten: `CHAT_PER_USER_DAILY` (standaard 20) en `CHAT_GLOBAL_DAILY` (standaard 100),
  geteld in Postgres (`ChatUsage`). Met `CHAT_ACCESS_CODE` is de assistent alleen bruikbaar met een code.
- Het gesprek staat in de browser; alleen de laatste 12 berichten (als tekst) gaan mee naar de API.

## ETF's

De catalogus bevat 16 bekende ETF's (`ETFS` in `lib/api/universe.ts`): S&P 500 (SPY, VOO, VUSA, CSPX), Nasdaq-100
(QQQ), wereld (VT, VWRL, VWCE, IWDA), VS breed/klein (VTI, IWM), Dow Jones (DIA), dividend (SCHD), chips (SMH),
opkomende markten (EMIM) en goud (GLD). ETF's krijgen dezelfde technische, sentiment- en risicoanalyse, maar
geen bedrijfscijfers (die zeggen niets over een mandje). Voor de lange termijn hoeft een brede ETF in de
historische toets niet beter te doen dan willekeurig instappen: daar is spreiden zelf de strategie. In de lijst
met kansen staat per index één ETF; de andere worden als alternatief genoemd.

## Betrouwbaarheid van de tips

- **Alleen echte data telt.** Mock-data (fallback als een bron onbereikbaar is) wordt nooit gebruikt om iets
  aan te raden. Rente en inflatie komen live uit FRED (met `FRED_API_KEY` via de API, anders via de openbare
  CSV-download); zonder FRED tellen ze niet mee.
- **Historische toets** (`lib/engine/evidence.ts`). Elke koopkans wordt getoetst op ± 5 jaar koershistorie van
  die asset: op elke dag waarop het technische signaal ook "kopen" gaf, wordt hetzelfde soort plan gesimuleerd
  (korte termijn: stop en eerste doel op dezelfde ATR-afstand als nu, max. 40 dagen; lange termijn: ± 3 maanden
  met dezelfde stop-breedte). Geen look-ahead, geen overlappende trades, 0,1% kosten per kant. Een tip wordt
  alleen getoond als het signaal gemiddeld winst gaf, vaak genoeg raak was **én** beter deed dan op een
  willekeurige dag instappen. Afgekeurde koopsignalen staan met reden onder de lijst.
- **Scorebord** (`/api/track-record`). Elke getoonde tip wordt in de database bewaard (model `Tip`) en achteraf
  nagekeken met de echte koersen ná het moment van de tip: doel gehaald, stop-loss geraakt, of de balans na de
  maximale termijn.

Geen enkel model kan de toekomst voorspellen: de toets laat zien wat in het verleden werkte, niet wat gaat komen.

## Quiz van de dag

Op de startpagina en op `/quiz` staat elke dag één vraag over beleggen of crypto, met een weetje in gewone taal.
De vraag wisselt om middernacht Nederlandse tijd en is voor iedereen dezelfde (`lib/quiz/questions.ts`); alle
vragen komen aan de beurt voordat er een terugkomt. Antwoorden, score en reeks (dagen op rij gespeeld) worden
lokaal in de browser bewaard.

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
4. Privé maken: **Settings → Environment Variables** → `APP_PASSWORD` = een sterk wachtwoord (Production) →
   **Redeploy**. Daarna toont elke pagina eerst een inlogscherm en geven alle API's `401` zonder sessie
   (`proxy.ts`). Je blijft per toestel een jaar ingelogd; een nieuw wachtwoord logt alle toestellen uit.
