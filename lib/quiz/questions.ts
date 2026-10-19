// ---------------------------------------------------------------------------
// Vragenbank voor de dagelijkse quiz. Elke vraag heeft één juist antwoord,
// een paar foute antwoorden en een weetje in makkelijke taal.
// ---------------------------------------------------------------------------

export type QuizTopic = "basis" | "crypto" | "geschiedenis" | "techniek" | "psychologie";

export interface QuizQuestion {
  id: string;
  topic: QuizTopic;
  question: string;
  correct: string;
  wrong: string[];
  fact: string;
}

export const TOPIC_LABEL: Record<QuizTopic, string> = {
  basis: "Beleggen 101",
  crypto: "Crypto",
  geschiedenis: "Geschiedenis",
  techniek: "Grafieken lezen",
  psychologie: "Brein & geld",
};

/** De volgorde is bewust gemengd: elke dag schuift de quiz één vraag op. */
export const QUESTIONS: QuizQuestion[] = [
  {
    id: "aandeel",
    topic: "basis",
    question: "Wat koop je eigenlijk als je een aandeel koopt?",
    correct: "Een klein stukje van een bedrijf",
    wrong: ["Een lening aan een bedrijf", "Een cadeaubon van een bedrijf", "Een stem bij de verkiezingen"],
    fact: "De VOC gaf in 1602 in Amsterdam de eerste aandelen ter wereld uit die iedereen kon kopen.",
  },
  {
    id: "satoshi",
    topic: "crypto",
    question: "Wie heeft Bitcoin bedacht?",
    correct: "Satoshi Nakamoto",
    wrong: ["Elon Musk", "Vitalik Buterin", "Bill Gates"],
    fact: "Niemand weet wie Satoshi Nakamoto echt is. De naam staat onder het Bitcoin-plan uit 2008, daarna verdween de maker.",
  },
  {
    id: "bull",
    topic: "basis",
    question: "Wat betekent een 'bull market'?",
    correct: "De koersen stijgen al een tijd",
    wrong: ["De koersen dalen al een tijd", "De beurs is gesloten", "Er wordt alleen in vee gehandeld"],
    fact: "Een stier (bull) stoot zijn hoorns omhoog, een beer (bear) slaat zijn klauwen omlaag. Zo onthoud je stijgen en dalen.",
  },
  {
    id: "wallstreet",
    topic: "geschiedenis",
    question: "Waar komt de naam 'Wall Street' vandaan?",
    correct: "Een muur die Nederlanders daar bouwden",
    wrong: ["Een bankier die Wall heette", "De hoge muren van de gebouwen", "Een oude Engelse koning"],
    fact: "In Nieuw-Amsterdam (nu New York) bouwden Nederlandse kolonisten in de 17e eeuw een houten muur. De straat ernaast heet nog steeds Wall Street.",
  },
  {
    id: "max-btc",
    topic: "crypto",
    question: "Hoeveel bitcoins kunnen er maximaal ooit bestaan?",
    correct: "21 miljoen",
    wrong: ["1 miljard", "Oneindig veel", "100 miljoen"],
    fact: "Die grens staat in de code van Bitcoin. Daarom noemen mensen het soms 'digitaal goud': er komt nooit meer bij dan dat.",
  },
  {
    id: "dividend",
    topic: "basis",
    question: "Wat is dividend?",
    correct: "Een deel van de winst dat het bedrijf aan aandeelhouders uitbetaalt",
    wrong: ["De kosten die je betaalt om te kopen", "Een boete als je te snel verkoopt", "De rente op je spaarrekening"],
    fact: "Niet elk bedrijf betaalt dividend. Groeibedrijven stoppen hun winst vaak liever terug in het bedrijf om sneller te groeien.",
  },
  {
    id: "rsi",
    topic: "techniek",
    question: "De RSI van een aandeel staat boven 70. Wat betekent dat meestal?",
    correct: "De koers is snel gestegen en kan even afkoelen",
    wrong: ["Het bedrijf gaat failliet", "Het aandeel is supergoedkoop", "Er is 70% kans op winst"],
    fact: "RSI is een meter van 0 tot 100 die laat zien hoe hard een koers recent bewoog. Boven 70 heet 'overbought', onder 30 'oversold'.",
  },
  {
    id: "loss-aversion",
    topic: "psychologie",
    question: "Hoe voelt €100 verliezen vergeleken met €100 winnen, volgens onderzoek?",
    correct: "Ongeveer twee keer zo erg",
    wrong: ["Precies even erg", "Half zo erg", "Je merkt het verschil niet"],
    fact: "Dit heet verliesaversie. Daardoor houden mensen verliezers vaak te lang vast, in de hoop dat ze 'terugkomen'.",
  },
  {
    id: "pizza",
    topic: "crypto",
    question: "Wat kocht iemand in 2010 voor 10.000 bitcoin?",
    correct: "Twee pizza's",
    wrong: ["Een huis", "Een auto", "Een vliegticket"],
    fact: "Dat gebeurde op 22 mei 2010. Sindsdien vieren crypto-fans die dag als 'Bitcoin Pizza Day'.",
  },
  {
    id: "spreiden",
    topic: "basis",
    question: "Waarom zeggen beleggers 'leg niet al je eieren in één mandje'?",
    correct: "Spreiden over veel beleggingen verkleint je risico",
    wrong: ["Eieren zijn een slechte belegging", "Eén aandeel geeft altijd meer winst", "Mandjes kosten extra geld"],
    fact: "Als je in 20 verschillende bedrijven belegt, doet één tegenvaller veel minder pijn dan als je alles in één bedrijf stopt.",
  },
  {
    id: "tulpen",
    topic: "geschiedenis",
    question: "Welke beroemde 'zeepbel' gebeurde rond 1637 in Nederland?",
    correct: "De tulpenmanie",
    wrong: ["De kaasbubbel", "De molenhype", "De klompencrisis"],
    fact: "Mensen betaalden toen enorme bedragen voor tulpenbollen. Toen niemand meer wilde kopen, stortten de prijzen in een paar dagen in.",
  },
  {
    id: "golden-cross",
    topic: "techniek",
    question: "Wat is een 'golden cross'?",
    correct: "Het 50-daags gemiddelde stijgt boven het 200-daags gemiddelde",
    wrong: ["De koers raakt precies een ronde prijs", "Goud wordt duurder dan zilver", "Een aandeel verdubbelt in een dag"],
    fact: "Het omgekeerde, als het 50-daags gemiddelde onder het 200-daagse zakt, heet een 'death cross'.",
  },
  {
    id: "etf",
    topic: "basis",
    question: "Wat is een ETF (indexfonds)?",
    correct: "Een mandje met veel aandelen dat je in één keer koopt",
    wrong: ["Eén heel duur aandeel", "Een soort cryptomunt", "Een spaarrekening bij de bank"],
    fact: "Met één ETF op de wereldindex ben je in één klap mede-eigenaar van duizenden bedrijven over de hele wereld.",
  },
  {
    id: "halving",
    topic: "crypto",
    question: "Wat gebeurt er bij een Bitcoin 'halving'?",
    correct: "Er komen voortaan half zoveel nieuwe bitcoins per blok bij",
    wrong: ["De prijs van Bitcoin halveert", "Iedereen verliest de helft van zijn bitcoins", "Bitcoin wordt in tweeën gesplitst"],
    fact: "Een halving gebeurt ongeveer elke vier jaar (elke 210.000 blokken). Zo worden nieuwe bitcoins steeds schaarser.",
  },
  {
    id: "fomo",
    topic: "psychologie",
    question: "Wat betekent FOMO?",
    correct: "De angst om iets mis te lopen",
    wrong: ["Een soort beleggingsfonds", "Een computerfout op de beurs", "Een Amerikaanse belasting"],
    fact: "FOMO (Fear Of Missing Out) laat mensen vaak kopen als iets al heel hard gestegen is: precies op het duurste moment.",
  },
  {
    id: "rule72",
    topic: "basis",
    question: "Je geld groeit 8% per jaar. Hoe lang duurt het ongeveer voor het verdubbeld is?",
    correct: "Ongeveer 9 jaar",
    wrong: ["Ongeveer 3 jaar", "Ongeveer 25 jaar", "Ongeveer 50 jaar"],
    fact: "Dat is de 'regel van 72': deel 72 door het rendement per jaar (72 ÷ 8 = 9). Rente op rente doet de rest.",
  },
  {
    id: "buffett",
    topic: "geschiedenis",
    question: "Welke bijnaam heeft superbelegger Warren Buffett?",
    correct: "Het Orakel van Omaha",
    wrong: ["De Wolf van Wall Street", "De Koning van Crypto", "De Stier van Chicago"],
    fact: "Buffett zegt: 'Wees angstig als anderen hebberig zijn, en hebberig als anderen angstig zijn.'",
  },
  {
    id: "support",
    topic: "techniek",
    question: "Wat is een 'steunniveau' (support) in een grafiek?",
    correct: "Een prijs waar de koers eerder vaak stopte met dalen",
    wrong: ["De hoogste koers ooit", "Het telefoonnummer van de helpdesk", "De prijs die de overheid vastzet"],
    fact: "Op zo'n niveau staan vaak veel kopers klaar. Zakt de koers er toch doorheen, dan daalt hij soms extra snel.",
  },
  {
    id: "stablecoin",
    topic: "crypto",
    question: "Wat is een stablecoin?",
    correct: "Een crypto die altijd ongeveer even veel waard is, bijv. 1 dollar",
    wrong: ["Een munt die nooit verhandeld mag worden", "Een munt van een paardenstal", "De oudste crypto ter wereld"],
    fact: "Bekende stablecoins zijn USDT en USDC. Handelaren gebruiken ze om even 'uit' crypto te stappen zonder naar de bank te gaan.",
  },
  {
    id: "inflatie",
    topic: "basis",
    question: "Wat is inflatie?",
    correct: "Prijzen stijgen, waardoor je geld minder kan kopen",
    wrong: ["Je spaargeld groeit vanzelf", "De beurs gaat dicht", "Banken geven gratis geld"],
    fact: "Bij 3% inflatie per jaar is €100 na tien jaar nog maar zo'n €74 'waard' aan koopkracht. Daarom beleggen veel mensen voor de lange termijn.",
  },
  {
    id: "black-monday",
    topic: "geschiedenis",
    question: "Hoeveel zakte de Amerikaanse Dow Jones op 'Black Monday' (19 oktober 1987)?",
    correct: "Ruim 22% op één dag",
    wrong: ["2% op één dag", "50% op één dag", "Hij steeg juist 10%"],
    fact: "Het is nog altijd de grootste daling op één dag in procenten. Binnen twee jaar stond de beurs weer hoger dan ervoor.",
  },
  {
    id: "stoploss",
    topic: "basis",
    question: "Waarvoor dient een stop-loss?",
    correct: "Automatisch verkopen als de koers onder een grens zakt",
    wrong: ["Stoppen met beleggen voor altijd", "Een aandeel kopen als het daalt", "Belasting terugvragen"],
    fact: "Met een stop-loss bepaal je vooraf hoeveel je maximaal wilt verliezen. Zo beslis je met je hoofd en niet in paniek.",
  },
  {
    id: "ethereum",
    topic: "crypto",
    question: "Wie is de bekendste bedenker van Ethereum?",
    correct: "Vitalik Buterin",
    wrong: ["Satoshi Nakamoto", "Mark Zuckerberg", "Jeff Bezos"],
    fact: "Vitalik was pas 19 jaar toen hij Ethereum bedacht. Het netwerk ging in 2015 live.",
  },
  {
    id: "asml",
    topic: "basis",
    question: "Wat maakt het Nederlandse bedrijf ASML?",
    correct: "Machines om computerchips te maken",
    wrong: ["Smartphones", "Elektrische auto's", "Zonnepanelen"],
    fact: "ASML uit Veldhoven is het enige bedrijf ter wereld dat EUV-machines maakt, nodig voor de allerkleinste chips. Eén machine kost honderden miljoenen.",
  },
  {
    id: "volatiliteit",
    topic: "techniek",
    question: "Wat betekent een hoge volatiliteit?",
    correct: "De koers schommelt heel hard op en neer",
    wrong: ["Het aandeel wordt bijna niet verhandeld", "Het bedrijf maakt veel winst", "De koers staat stil"],
    fact: "Crypto is meestal veel volatieler dan aandelen. Een beweging van 10% op één dag is bij crypto niet bijzonder.",
  },
  {
    id: "dca",
    topic: "psychologie",
    question: "Wat is periodiek beleggen (elke maand een vast bedrag)?",
    correct: "Een manier om niet het 'perfecte moment' te hoeven kiezen",
    wrong: ["Alleen kopen op maandag", "Elke maand alles verkopen", "Lenen om meer te beleggen"],
    fact: "Met een vast bedrag koop je automatisch méér als de koers laag is en minder als hij hoog is. Dat haalt de stress weg.",
  },
  {
    id: "marktwaarde",
    topic: "basis",
    question: "Hoe bereken je de beurswaarde (market cap) van een bedrijf?",
    correct: "Koers van één aandeel × aantal aandelen",
    wrong: ["Omzet × 10", "Aantal werknemers × salaris", "Winst gedeeld door schulden"],
    fact: "Een aandeel van €10 kan dus bij een groter bedrijf horen dan een aandeel van €500. De koers alleen zegt weinig.",
  },
  {
    id: "satoshi-unit",
    topic: "crypto",
    question: "Hoe heet het kleinste stukje van een bitcoin?",
    correct: "Een satoshi",
    wrong: ["Een bitje", "Een cent", "Een block"],
    fact: "Eén bitcoin bestaat uit 100 miljoen satoshi's. Je hoeft dus nooit een hele bitcoin te kopen.",
  },
  {
    id: "apple-trillion",
    topic: "geschiedenis",
    question: "Welk Amerikaans bedrijf was als eerste 1 biljoen dollar waard op de beurs?",
    correct: "Apple",
    wrong: ["Microsoft", "Amazon", "Tesla"],
    fact: "Apple haalde die grens in augustus 2018. Een biljoen is duizend miljard: een 1 met twaalf nullen.",
  },
  {
    id: "beurstijd",
    topic: "basis",
    question: "Hoe laat (Nederlandse tijd) opent de beurs in New York meestal?",
    correct: "15:30",
    wrong: ["09:00", "12:00", "22:00"],
    fact: "In New York is het dan 9:30 's ochtends. Crypto wordt daarentegen 24 uur per dag, 7 dagen per week verhandeld.",
  },
  {
    id: "dotcom",
    topic: "geschiedenis",
    question: "Wat was de 'dotcom-bubbel' rond het jaar 2000?",
    correct: "Een hype rond internetbedrijven die daarna hard instortte",
    wrong: ["Een tekort aan computers", "Een nieuwe munt in Europa", "Een virus op de beurs"],
    fact: "De Nasdaq, vol techbedrijven, zakte van 2000 tot 2002 bijna 80%. Bedrijven als Amazon overleefden wel en groeiden later enorm.",
  },
  {
    id: "macd",
    topic: "techniek",
    question: "Waar kijkt de MACD-indicator vooral naar?",
    correct: "Of de koers vaart maakt of juist afremt",
    wrong: ["Hoeveel winst het bedrijf maakt", "Wie de baas van het bedrijf is", "Het weer in New York"],
    fact: "MACD vergelijkt een snel en een traag gemiddelde. Kruist de MACD-lijn omhoog door zijn signaallijn, dan zien handelaren dat als koopsignaal.",
  },
  {
    id: "wallet",
    topic: "crypto",
    question: "Wat betekent 'not your keys, not your coins'?",
    correct: "Als iemand anders je sleutels beheert, heb je je crypto niet echt zelf",
    wrong: ["Sleutels zijn meer waard dan munten", "Je moet je huissleutel bewaren", "Munten zonder sleutel zijn gratis"],
    fact: "Als een cryptobeurs failliet gaat, kun je je munten kwijt zijn. Daarom bewaren sommige mensen hun crypto in een eigen wallet.",
  },
  {
    id: "obligatie",
    topic: "basis",
    question: "Wat is een obligatie?",
    correct: "Een lening aan een bedrijf of overheid waarvoor je rente krijgt",
    wrong: ["Een stukje eigendom van een bedrijf", "Een verplichting om aandelen te kopen", "Een soort crypto"],
    fact: "Obligaties schommelen meestal minder dan aandelen. Daarom mixen veel mensen ze in hun portfolio voor rust.",
  },
  {
    id: "fear-greed",
    topic: "psychologie",
    question: "De Fear & Greed-meter staat op 10. Wat betekent dat?",
    correct: "Beleggers zijn heel bang",
    wrong: ["Beleggers zijn heel hebberig", "De markt is gesloten", "10% van de aandelen stijgt"],
    fact: "De meter loopt van 0 (extreme angst) tot 100 (extreme hebzucht). Extreme angst was in het verleden vaak een goed koopmoment.",
  },
  {
    id: "nvidia",
    topic: "geschiedenis",
    question: "Waar werd Nvidia oorspronkelijk bekend mee?",
    correct: "Videokaarten voor games",
    wrong: ["Zoekmachines", "Elektrische auto's", "Sociale media"],
    fact: "De chips die games mooi maakten, blijken ook perfect voor kunstmatige intelligentie. Daardoor werd Nvidia een van de grootste bedrijven ter wereld.",
  },
  {
    id: "dogecoin",
    topic: "crypto",
    question: "Hoe is Dogecoin ontstaan?",
    correct: "Als grap, met een Shiba Inu-hondje als logo",
    wrong: ["Door een grote bank", "Door de Amerikaanse overheid", "Als opvolger van Bitcoin door Satoshi"],
    fact: "Dogecoin werd in 2013 gemaakt om crypto-hype een beetje belachelijk te maken. Toch werd hij miljarden waard.",
  },
  {
    id: "correctie",
    topic: "basis",
    question: "Wanneer spreken beleggers van een 'correctie'?",
    correct: "Als de koers zo'n 10% of meer onder de top zakt",
    wrong: ["Als iemand een typfout maakt", "Als de koers 1% daalt", "Als de beurs op vrijdag sluit"],
    fact: "Zakt het 20% of meer, dan heet het een 'bear market'. Correcties komen gemiddeld ongeveer eens per jaar of twee voor.",
  },
  {
    id: "limit",
    topic: "basis",
    question: "Wat doet een limietorder?",
    correct: "Kopen of verkopen alleen tegen jouw prijs of beter",
    wrong: ["Direct kopen tegen elke prijs", "Je maximaal één keer per dag laten handelen", "De beurs pauzeren"],
    fact: "Een 'marketorder' koopt meteen tegen de prijs van dat moment. Bij snelle bewegingen kan die prijs tegenvallen.",
  },
  {
    id: "blockchain",
    topic: "crypto",
    question: "Wat is een blockchain?",
    correct: "Een openbaar kasboek waarin blokken met transacties aan elkaar vastzitten",
    wrong: ["Een fietsketting met blokjes", "Een geheime bankrekening", "Een computerspel"],
    fact: "Omdat elk blok naar het vorige verwijst, kun je oude transacties niet stiekem aanpassen zonder dat iedereen het ziet.",
  },
  {
    id: "kw",
    topic: "basis",
    question: "Wat vertelt de koers-winstverhouding (K/W)?",
    correct: "Hoeveel jaar winst je betaalt voor één aandeel",
    wrong: ["Hoeveel werknemers het bedrijf heeft", "Hoe oud het bedrijf is", "Hoeveel dividend je krijgt"],
    fact: "Een K/W van 20 betekent: je betaalt 20 keer de jaarwinst. Snelgroeiende bedrijven hebben vaak een hoge K/W.",
  },
  {
    id: "rente",
    topic: "basis",
    question: "Wat doet een centrale bank meestal als de inflatie te hoog is?",
    correct: "De rente verhogen",
    wrong: ["Gratis geld uitdelen", "De beurs sluiten", "Alle prijzen bevriezen"],
    fact: "Hogere rente maakt lenen duurder. Dat remt de economie af, en vaak ook de koersen van groeiaandelen.",
  },
  {
    id: "mining",
    topic: "crypto",
    question: "Wat doen Bitcoin-miners?",
    correct: "Met computers transacties bevestigen en daarvoor nieuwe bitcoins krijgen",
    wrong: ["Goud zoeken in mijnen", "Bitcoins vernietigen", "Bitcoins drukken op papier"],
    fact: "Bitcoin-mining gebruikt zoveel stroom als een middelgroot land. Daarom zoeken miners vaak goedkope of groene energie.",
  },
  {
    id: "ipo",
    topic: "basis",
    question: "Wat is een IPO?",
    correct: "De eerste keer dat een bedrijf aandelen op de beurs verkoopt",
    wrong: ["Een nieuwe iPhone", "Een belasting op winst", "Een beursvakantie"],
    fact: "Een IPO heet in het Nederlands een beursgang. Adyen ging in 2018 naar de Amsterdamse beurs en verdubbelde op de eerste dag bijna.",
  },
  {
    id: "short",
    topic: "techniek",
    question: "Wat betekent 'short gaan'?",
    correct: "Geld verdienen als een koers daalt",
    wrong: ["Heel kort een aandeel vasthouden", "Een klein bedrag beleggen", "Stoppen met handelen"],
    fact: "Short gaan is riskant: een koers kan in theorie oneindig stijgen, dus je verlies heeft geen plafond.",
  },
  {
    id: "time-in-market",
    topic: "psychologie",
    question: "Wat zeggen veel beleggers: 'time in the market beats…'",
    correct: "'…timing the market'",
    wrong: ["'…money in the bank'", "'…luck in the casino'", "'…news on the TV'"],
    fact: "Wie de paar beste beursdagen mist, verliest een groot deel van het rendement. En die beste dagen komen vaak vlak na de slechtste.",
  },
  {
    id: "liquiditeit",
    topic: "basis",
    question: "Wat betekent het als een aandeel 'liquide' is?",
    correct: "Je kunt het makkelijk kopen en verkopen",
    wrong: ["Het bedrijf maakt drankjes", "De koers is gesmolten", "Het aandeel is gratis"],
    fact: "Bij kleine, weinig verhandelde munten of aandelen kan één grote order de prijs flink laten springen.",
  },
  {
    id: "sp500",
    topic: "geschiedenis",
    question: "Hoeveel heeft de S&P 500 gemiddeld per jaar opgeleverd over de lange termijn, inclusief dividend?",
    correct: "Ongeveer 10%",
    wrong: ["Ongeveer 1%", "Ongeveer 30%", "Ongeveer 50%"],
    fact: "Dat is een gemiddelde over vele decennia. In losse jaren kan het zomaar −30% of +30% zijn.",
  },
  {
    id: "bollinger",
    topic: "techniek",
    question: "Wat betekent het als de Bollinger Bands heel smal worden ('squeeze')?",
    correct: "Het is rustig, en vaak volgt daarna een grote beweging",
    wrong: ["Het aandeel wordt van de beurs gehaald", "De koers wordt nul", "Er mag niet meer gehandeld worden"],
    fact: "Een squeeze vertelt niet welke kant het opgaat, alleen dat er iets aan zit te komen. Kijk daarom ook naar andere signalen.",
  },  // --- Uitbreiding: meer vragen, zodat er elke dag drie nieuwe zijn ---------------
  {
    id: "broker",
    topic: "basis",
    question: "Wat is een broker?",
    correct: "Een partij via wie je aandelen en ETF's koopt en verkoopt",
    wrong: ["Iemand die beurskoersen voorspelt", "Een soort cryptomunt", "Een belasting op winst"],
    fact: "Brokers rekenen kosten per aankoop of een percentage. Vergelijk ze: bij kleine bedragen maken een paar euro kosten al veel verschil.",
  },
  {
    id: "bel20",
    topic: "basis",
    question: "Hoeveel bedrijven zitten er in de BEL 20, de belangrijkste index van de Brusselse beurs?",
    correct: "20",
    wrong: ["10", "50", "100"],
    fact: "Een index is een mandje dat laat zien hoe een groep aandelen het samen doet. In Amsterdam heet de bekendste index de AEX.",
  },
  {
    id: "blue-chip",
    topic: "basis",
    question: "Wat is een 'blue chip'?",
    correct: "Een aandeel van een groot, stabiel en bekend bedrijf",
    wrong: ["Een goedkope computerchip", "Een nieuwe cryptomunt", "Een aandeel dat net naar de beurs ging"],
    fact: "De naam komt van poker: de blauwe fiches waren daar het meest waard.",
  },
  {
    id: "groei-waarde",
    topic: "basis",
    question: "Wie wordt de 'vader van het waardebeleggen' genoemd?",
    correct: "Benjamin Graham",
    wrong: ["Elon Musk", "Satoshi Nakamoto", "Karl Marx"],
    fact: "Graham leerde beleggers bedrijven te kopen die goedkoop zijn vergeleken met wat ze echt waard zijn. Warren Buffett was zijn leerling.",
  },
  {
    id: "split",
    topic: "basis",
    question: "Wat gebeurt er bij een aandelensplitsing (split)?",
    correct: "Eén aandeel wordt opgeknipt in meerdere goedkopere aandelen",
    wrong: ["Het bedrijf wordt in tweeën gedeeld", "Je verliest de helft van je geld", "Het aandeel verdwijnt van de beurs"],
    fact: "Je bezit daarna meer aandelen die elk minder waard zijn; samen is het evenveel. Nvidia deed in 2024 een split van 1 naar 10.",
  },
  {
    id: "buyback",
    topic: "basis",
    question: "Wat doet een bedrijf bij een 'buyback'?",
    correct: "Het koopt zijn eigen aandelen terug",
    wrong: ["Het koopt een ander bedrijf", "Het betaalt klanten terug", "Het leent geld bij de bank"],
    fact: "Daarna zijn er minder aandelen, dus krijgt elk overgebleven aandeel een groter stukje van de winst. Apple kocht zo al honderden miljarden dollars aan eigen aandelen terug.",
  },
  {
    id: "ex-dividend",
    topic: "basis",
    question: "Wat betekent de 'ex-dividenddatum'?",
    correct: "Wie vanaf die dag koopt, krijgt het komende dividend niet meer",
    wrong: ["De dag dat het bedrijf stopt met dividend", "De dag dat je dividend dubbel krijgt", "De laatste dag van het boekjaar"],
    fact: "Op die dag zakt de koers vaak ongeveer met het bedrag van het dividend. Gratis geld bestaat dus niet.",
  },
  {
    id: "spread",
    topic: "basis",
    question: "Wat is de 'spread' als je iets koopt op de beurs?",
    correct: "Het verschil tussen de koopprijs en de verkoopprijs",
    wrong: ["De winst van het bedrijf", "Hoe ver je je geld spreidt", "De rente op je rekening"],
    fact: "Bij populaire aandelen is de spread heel klein. Bij kleine, weinig verhandelde munten kan hij flink oplopen: een verborgen kost.",
  },
  {
    id: "rente-op-rente",
    topic: "basis",
    question: "Je belegt € 1.000 en dat groeit 30 jaar lang 7% per jaar. Hoeveel heb je dan ongeveer?",
    correct: "Ongeveer € 7.600",
    wrong: ["Ongeveer € 3.100", "Ongeveer € 2.100", "Ongeveer € 30.000"],
    fact: "Dat komt door rente op rente: je verdient ook over de winst van eerdere jaren. Hoe langer je wacht, hoe harder het gaat.",
  },
  {
    id: "kosten",
    topic: "basis",
    question: "Hoeveel scheelt 1% extra kosten per jaar ongeveer over 30 jaar?",
    correct: "Bijna een kwart van je eindbedrag",
    wrong: ["Precies 1%", "Niets, kosten tellen niet", "Ongeveer 3%"],
    fact: "Kosten stapelen net als rendement op. Daarom zijn goedkope indexfondsen voor de lange termijn zo populair.",
  },
  {
    id: "ter",
    topic: "basis",
    question: "Wat vertelt de TER van een ETF?",
    correct: "Hoeveel kosten het fonds per jaar rekent",
    wrong: ["Hoeveel winst het vorig jaar maakte", "Hoeveel bedrijven erin zitten", "Hoe risicovol het is"],
    fact: "Brede ETF's kosten vaak maar 0,03% tot 0,25% per jaar. Bij € 1.000 is dat 30 cent tot € 2,50.",
  },
  {
    id: "accumulerend",
    topic: "basis",
    question: "Wat doet een 'accumulerende' ETF met het dividend?",
    correct: "Het herbelegt het dividend automatisch",
    wrong: ["Het betaalt het elke maand uit", "Het geeft het aan een goed doel", "Er is nooit dividend"],
    fact: "Bij een 'distribuerende' ETF krijg je het dividend wel uitbetaald. VWCE herbelegt, VWRL keert uit: hetzelfde mandje, andere smaak.",
  },
  {
    id: "dividendrendement",
    topic: "basis",
    question: "Hoe bereken je het dividendrendement?",
    correct: "Dividend per jaar gedeeld door de koers",
    wrong: ["Winst gedeeld door het aantal werknemers", "Koers gedeeld door de omzet", "Het dividend keer tien"],
    fact: "Een heel hoog dividendrendement kan een waarschuwing zijn: soms is de koers hard gezakt omdat het bedrijf in de problemen zit.",
  },
  {
    id: "kasstroom",
    topic: "basis",
    question: "Wat is vrije kasstroom (free cash flow)?",
    correct: "Het geld dat overblijft nadat het bedrijf alles betaald en geïnvesteerd heeft",
    wrong: ["Geld dat het bedrijf gratis krijgt", "De omzet van één dag", "Het salaris van de baas"],
    fact: "Winst op papier kan mooi lijken, maar alleen echt geld in kas kan dividend, aflossingen of buybacks betalen.",
  },
  {
    id: "nyse",
    topic: "basis",
    question: "Welke beurs is de grootste ter wereld, gemeten naar beurswaarde?",
    correct: "De New York Stock Exchange (NYSE)",
    wrong: ["De beurs van Amsterdam", "De beurs van Tokio", "De beurs van Londen"],
    fact: "De Nasdaq, ook in New York, staat op de tweede plaats. Samen noteren ze de meeste grote bedrijven van de wereld.",
  },
  {
    id: "obligatie-rente",
    topic: "basis",
    question: "Wat gebeurt er meestal met de waarde van bestaande obligaties als de rente stijgt?",
    correct: "Die daalt",
    wrong: ["Die stijgt", "Die blijft altijd gelijk", "Die wordt nul"],
    fact: "Nieuwe obligaties betalen dan meer rente, dus willen kopers minder betalen voor de oude. Rente en obligatiekoersen bewegen tegengesteld.",
  },
  {
    id: "horizon",
    topic: "psychologie",
    question: "Wat is je 'beleggingshorizon'?",
    correct: "Hoe lang je je geld kunt laten staan",
    wrong: ["Het moment waarop de beurs opent", "De hoogste koers ooit", "Het land waar je belegt"],
    fact: "Geld dat je binnen een paar jaar nodig hebt, beleg je beter voorzichtig. Hoe langer je horizon, hoe meer schommelingen je kunt uitzitten.",
  },
  {
    id: "altcoin",
    topic: "crypto",
    question: "Wat is een 'altcoin'?",
    correct: "Elke cryptomunt behalve Bitcoin",
    wrong: ["Een munt van aluminium", "Een munt die alleen omhoog gaat", "De oudste cryptomunt"],
    fact: "Er bestaan duizenden altcoins. Veel ervan zijn na een paar jaar bijna niets meer waard.",
  },
  {
    id: "ftx",
    topic: "crypto",
    question: "Wat gebeurde er in 2022 met de grote cryptobeurs FTX?",
    correct: "Hij ging failliet en klanten konden niet meer bij hun geld",
    wrong: ["Hij werd de grootste bank ter wereld", "Hij werd gekocht door Apple", "Hij werd een land"],
    fact: "Daarom zeggen crypto-fans 'not your keys, not your coins': laat niet al je munten op één beurs staan.",
  },
  {
    id: "proof-of-stake",
    topic: "crypto",
    question: "Hoeveel minder stroom verbruikte Ethereum na de overstap naar 'proof of stake' in 2022?",
    correct: "Ongeveer 99,9% minder",
    wrong: ["Ongeveer 10% minder", "Juist twee keer zoveel", "Precies evenveel"],
    fact: "Bij proof of stake zetten deelnemers munten vast in plaats van met zware computers puzzels op te lossen. Die overstap heette 'The Merge'.",
  },
  {
    id: "nft",
    topic: "crypto",
    question: "Voor hoeveel werd een digitaal kunstwerk (NFT) van Beeple in 2021 geveild?",
    correct: "Ongeveer 69 miljoen dollar",
    wrong: ["Ongeveer 69 dollar", "Ongeveer 6.900 dollar", "Ongeveer 6,9 miljard dollar"],
    fact: "Een NFT is een uniek digitaal eigendomsbewijs op een blockchain. Na de hype van 2021 zakten de meeste NFT-prijzen hard.",
  },
  {
    id: "seed-phrase",
    topic: "crypto",
    question: "Wat moet je met de 'seed phrase' (herstelwoorden) van je wallet doen?",
    correct: "Veilig bewaren en nooit aan iemand geven",
    wrong: ["Delen met de helpdesk als die erom vraagt", "Online zetten als back-up", "Elke week veranderen"],
    fact: "Wie je herstelwoorden heeft, heeft je crypto. Echte bedrijven vragen er nooit om: wie dat wel doet, is een oplichter.",
  },
  {
    id: "gas",
    topic: "crypto",
    question: "Wat zijn 'gas fees' bij Ethereum?",
    correct: "Kosten die je betaalt om een transactie te laten verwerken",
    wrong: ["Een belasting op benzine", "Gratis munten voor nieuwe gebruikers", "De rente op een spaarrekening"],
    fact: "Als het druk is op het netwerk, stijgen de kosten. Daarom bestaan er 'layer 2'-netwerken die transacties goedkoper bundelen.",
  },
  {
    id: "el-salvador",
    topic: "geschiedenis",
    question: "Welk land maakte in 2021 als eerste Bitcoin een officieel betaalmiddel?",
    correct: "El Salvador",
    wrong: ["Nederland", "Japan", "Zwitserland"],
    fact: "Iedereen kreeg er een gratis Bitcoin-app bij. In de praktijk bleven de meeste inwoners toch gewoon met dollars betalen.",
  },
  {
    id: "rug-pull",
    topic: "crypto",
    question: "Wat is een 'rug pull' in crypto?",
    correct: "De makers verdwijnen ineens met het geld van de kopers",
    wrong: ["Een tapijt dat je met crypto koopt", "Een snelle koersstijging", "Een gratis uitdeling van munten"],
    fact: "Vooral nieuwe, onbekende munten met grote beloftes zijn riskant. Als iets te mooi lijkt om waar te zijn, is het dat meestal ook.",
  },
  {
    id: "btc-etf",
    topic: "crypto",
    question: "Wanneer keurde de Amerikaanse toezichthouder ETF's goed die echte bitcoins bezitten?",
    correct: "In januari 2024",
    wrong: ["In 2009", "In 2015", "Dat is nooit gebeurd"],
    fact: "Daardoor kunnen beleggers via een gewone beursnotering in Bitcoin beleggen, zonder zelf een wallet te beheren.",
  },
  {
    id: "block-reward",
    topic: "crypto",
    question: "Hoeveel nieuwe bitcoins krijgt een miner per blok sinds de halving van april 2024?",
    correct: "3,125",
    wrong: ["50", "12,5", "1.000"],
    fact: "In 2009 was dat nog 50. Om de ± vier jaar halveert de beloning, tot er rond 2140 geen nieuwe bitcoins meer bijkomen.",
  },
  {
    id: "block-time",
    topic: "crypto",
    question: "Hoe vaak wordt er ongeveer een nieuw Bitcoin-blok gemaakt?",
    correct: "Elke 10 minuten",
    wrong: ["Elke seconde", "Elke dag", "Elke maand"],
    fact: "Het netwerk past de moeilijkheid van de puzzel automatisch aan, zodat het tempo rond de 10 minuten blijft, hoeveel computers er ook meedoen.",
  },
  {
    id: "smart-contract",
    topic: "crypto",
    question: "Wat is een 'smart contract'?",
    correct: "Een programma op een blockchain dat automatisch afspraken uitvoert",
    wrong: ["Een contract met een advocaat", "Een slimme telefoon", "Een papieren aandeel"],
    fact: "Ethereum maakte smart contracts populair. Ze vormen de basis van DeFi: lenen en ruilen zonder bank.",
  },
  {
    id: "hodl",
    topic: "crypto",
    question: "Waar komt het crypto-woord 'HODL' vandaan?",
    correct: "Een tikfout van 'hold' in een forumbericht uit 2013",
    wrong: ["Een afkorting van een Duitse bank", "De naam van de Bitcoin-bedenker", "Een computertaal"],
    fact: "Iemand schreef dronken 'I AM HODLING' toen de koers daalde. Het werd de slogan voor: niet in paniek verkopen, gewoon vasthouden.",
  },
  {
    id: "terra",
    topic: "geschiedenis",
    question: "Wat gebeurde er in 2022 met de stablecoin TerraUSD (UST)?",
    correct: "Hij verloor zijn koppeling aan de dollar en stortte in",
    wrong: ["Hij werd de officiële munt van Europa", "Hij steeg 1.000% in een dag", "Hij werd omgeruild voor goud"],
    fact: "In een paar dagen verdwenen tientallen miljarden dollars. Een 'stabiele' munt is dus niet altijd stabiel.",
  },
  {
    id: "whale",
    topic: "crypto",
    question: "Wat is een 'whale' (walvis) in crypto?",
    correct: "Iemand die heel veel munten bezit",
    wrong: ["Een munt met een vis als logo", "Een heel trage transactie", "Een beurs in de zee"],
    fact: "Als een walvis in één keer verkoopt, kan de koers flink schrikken. Daarom houden handelaren grote portemonnees in de gaten.",
  },
  {
    id: "crash-1929",
    topic: "geschiedenis",
    question: "Wanneer was de grote beurskrach die de Grote Depressie inluidde?",
    correct: "Oktober 1929",
    wrong: ["Mei 1960", "Januari 2000", "Juni 1815"],
    fact: "De Dow Jones stond pas in 1954 weer op het niveau van vóór de krach: ruim 25 jaar later.",
  },
  {
    id: "lehman",
    topic: "geschiedenis",
    question: "Welke bank ging in september 2008 failliet en zette de wereldwijde financiële crisis in gang?",
    correct: "Lehman Brothers",
    wrong: ["ING", "Goldman Sachs", "De Nederlandsche Bank"],
    fact: "Het is nog altijd het grootste faillissement uit de Amerikaanse geschiedenis.",
  },
  {
    id: "corona",
    topic: "geschiedenis",
    question: "Hoeveel zakte de S&P 500 ongeveer in de coronacrash van februari–maart 2020?",
    correct: "Ruim 30%",
    wrong: ["Ongeveer 3%", "Ongeveer 90%", "Hij steeg juist"],
    fact: "Binnen ongeveer vijf maanden stond de index alweer op een recordhoogte. Wie in paniek verkocht, miste dat herstel.",
  },
  {
    id: "mag7",
    topic: "geschiedenis",
    question: "Welk bedrijf hoort NIET bij de 'Magnificent Seven' techbedrijven?",
    correct: "Netflix",
    wrong: ["Nvidia", "Apple", "Microsoft"],
    fact: "De zeven zijn Apple, Microsoft, Alphabet (Google), Amazon, Nvidia, Meta en Tesla. Samen zijn ze een groot deel van de S&P 500.",
  },
  {
    id: "euro",
    topic: "geschiedenis",
    question: "Sinds wanneer betalen we met euromunten en -biljetten?",
    correct: "1 januari 2002",
    wrong: ["1 januari 1990", "1 januari 2010", "1 januari 1999"],
    fact: "Op de beurs en in bankrekeningen bestond de euro al sinds 1999. Contant geld kwam drie jaar later.",
  },
  {
    id: "gamestop",
    topic: "geschiedenis",
    question: "Wat gebeurde er begin 2021 met het aandeel GameStop?",
    correct: "Particuliere beleggers van Reddit joegen de koers enorm op",
    wrong: ["Het bedrijf werd gekocht door Nintendo", "Het aandeel werd verboden", "Het bedrijf ging naar de maan"],
    fact: "Hedgefondsen die op een daling hadden gegokt (short), verloren miljarden. Later zakte de koers weer hard.",
  },
  {
    id: "nvidia-top",
    topic: "geschiedenis",
    question: "Welk bedrijf was in 2024 even het meest waardevolle bedrijf ter wereld, dankzij AI-chips?",
    correct: "Nvidia",
    wrong: ["Coca-Cola", "Shell", "Philips"],
    fact: "De vraag naar chips voor kunstmatige intelligentie liet de koers in een paar jaar meer dan vertienvoudigen.",
  },
  {
    id: "amazon-ipo",
    topic: "geschiedenis",
    question: "In welk jaar ging Amazon naar de beurs?",
    correct: "1997",
    wrong: ["1985", "2004", "2012"],
    fact: "Amazon begon als online boekwinkel. Na de dotcom-crash zakte het aandeel meer dan 90%, en daarna werd het een van de grootste bedrijven ter wereld.",
  },
  {
    id: "dow-1896",
    topic: "geschiedenis",
    question: "In welk jaar begon de Dow Jones Industrial Average?",
    correct: "1896",
    wrong: ["1602", "1950", "1999"],
    fact: "In het begin zaten er maar 12 bedrijven in. Nu zijn het er 30.",
  },
  {
    id: "bogle",
    topic: "geschiedenis",
    question: "Wie bedacht het indexfonds voor gewone beleggers?",
    correct: "John Bogle, de oprichter van Vanguard",
    wrong: ["Warren Buffett", "Elon Musk", "Satoshi Nakamoto"],
    fact: "Zijn eerste indexfonds startte in 1976 en werd eerst uitgelachen. Nu staan er duizenden miljarden in indexfondsen.",
  },
  {
    id: "stier",
    topic: "geschiedenis",
    question: "Hoe kwam het bekende bronzen stierbeeld bij Wall Street er te staan?",
    correct: "Een kunstenaar zette het er in 1989 zonder toestemming neer",
    wrong: ["De beurs liet het in 1792 maken", "Het werd uit Spanje geïmporteerd", "Het is een gewoon reclamebord"],
    fact: "Arturo Di Modica wilde na de krach van 1987 optimisme tonen. De stad liet het beeld daarna gewoon staan.",
  },
  {
    id: "btc-2022",
    topic: "geschiedenis",
    question: "Hoeveel zakte Bitcoin ongeveer van de top in 2021 tot de bodem in 2022?",
    correct: "Ongeveer 75%",
    wrong: ["Ongeveer 5%", "Ongeveer 25%", "Hij zakte helemaal niet"],
    fact: "Zulke dalingen gebeurden al vaker bij Bitcoin. Wie crypto koopt, moet zulke klappen kunnen uitzitten.",
  },
  {
    id: "candle",
    topic: "techniek",
    question: "Wat laat één kaars (candlestick) in een grafiek zien?",
    correct: "De begin-, hoogste, laagste en slotkoers van een periode",
    wrong: ["Alleen de slotkoers", "Hoeveel werknemers het bedrijf heeft", "Het weer van die dag"],
    fact: "Candlesticks komen uit Japan, waar handelaren ze in de 18e eeuw gebruikten voor de rijsthandel.",
  },
  {
    id: "groene-kaars",
    topic: "techniek",
    question: "Wat betekent een groene kaars in een grafiek?",
    correct: "De koers sloot hoger dan hij opende",
    wrong: ["Het bedrijf is milieuvriendelijk", "De koers sloot lager dan hij opende", "Er was geen handel"],
    fact: "Een rode kaars betekent het omgekeerde. Een lange 'lont' aan de kaars toont dat de koers even ver uitschoot en weer terugkwam.",
  },
  {
    id: "weerstand",
    topic: "techniek",
    question: "Wat is een 'weerstand' in een grafiek?",
    correct: "Een prijs waar de koers eerder vaak stopte met stijgen",
    wrong: ["Een elektrisch onderdeel in de beurs", "De laagste koers ooit", "Een verbod op handelen"],
    fact: "Breekt de koers er met veel volume doorheen, dan heet dat een 'breakout'. De oude weerstand wordt dan vaak een nieuwe steun.",
  },
  {
    id: "volume",
    topic: "techniek",
    question: "Waarom kijken handelaren naar het handelsvolume?",
    correct: "Een beweging met veel volume is sterker en betrouwbaarder",
    wrong: ["Hoe harder de muziek, hoe hoger de koers", "Volume zegt hoeveel winst het bedrijf maakt", "Het telt het aantal aandeelhouders"],
    fact: "Een stijging waar maar weinig mensen aan meedoen, kan net zo snel weer verdwijnen.",
  },
  {
    id: "voortschrijdend",
    topic: "techniek",
    question: "Wat is een voortschrijdend gemiddelde (bijv. het 50-daags gemiddelde)?",
    correct: "De gemiddelde koers van de laatste 50 dagen, elke dag opnieuw berekend",
    wrong: ["De hoogste koers van het jaar", "Het gemiddelde loon van werknemers", "Een gemiddelde van alle beurzen samen"],
    fact: "Zo'n gemiddelde strijkt de dagelijkse schommelingen glad. Ligt de koers erboven, dan zit hij meestal in een stijgende trend.",
  },
  {
    id: "trend",
    topic: "techniek",
    question: "Wanneer spreek je van een stijgende trend?",
    correct: "Als de koers steeds hogere toppen en hogere bodems maakt",
    wrong: ["Als de koers één dag stijgt", "Als het bedrijf veel reclame maakt", "Als de koers stilstaat"],
    fact: "'The trend is your friend': tegen een sterke trend in handelen is meestal geen goed idee.",
  },
  {
    id: "gap",
    topic: "techniek",
    question: "Wat is een 'gap' (gat) in een koersgrafiek?",
    correct: "Een sprong: de koers opent ver van de slotkoers van de dag ervoor",
    wrong: ["Een dag zonder internet", "Een fout in de grafiek", "Het verschil tussen twee bedrijven"],
    fact: "Gaps ontstaan vaak na nieuws dat buiten beurstijd uitkomt, zoals kwartaalcijfers. Een stop-loss kan dan lager uitvallen dan ingesteld.",
  },
  {
    id: "atr",
    topic: "techniek",
    question: "Waarvoor gebruiken handelaren de ATR (Average True Range)?",
    correct: "Om te zien hoeveel een koers gemiddeld per dag beweegt, bijv. voor de stop-loss",
    wrong: ["Om de winst van het bedrijf te berekenen", "Om de rente te voorspellen", "Om het aantal aandelen te tellen"],
    fact: "Beursradar zet de stop-loss op een afstand in ATR's: bij een beweeglijk aandeel ruimer, bij een rustig aandeel krapper.",
  },
  {
    id: "rsi-30",
    topic: "techniek",
    question: "De RSI van een aandeel zakt onder 30. Wat betekent dat meestal?",
    correct: "De koers is snel gedaald en kan even opveren",
    wrong: ["Het bedrijf is failliet", "Je moet altijd meteen verkopen", "De koers verdubbelt zeker"],
    fact: "Onder 30 heet 'oversold'. In een sterke daling kan de RSI wel lang laag blijven: het is een seintje, geen garantie.",
  },
  {
    id: "backtest",
    topic: "techniek",
    question: "Wat is backtesten?",
    correct: "Een strategie uitproberen op koersen uit het verleden",
    wrong: ["Je geld terugvragen bij de bank", "Een test voor rugpijn", "Een aandeel terugkopen"],
    fact: "Beursradar toetst elke tip zo op ± 5 jaar historie. Let wel: wat vroeger werkte, werkt niet gegarandeerd in de toekomst.",
  },
  {
    id: "kudde",
    topic: "psychologie",
    question: "Wat is kuddegedrag op de beurs?",
    correct: "Kopen of verkopen omdat iedereen het doet",
    wrong: ["Beleggen in boerderijen", "Samen een fonds oprichten", "Alleen beleggen in dieren-aandelen"],
    fact: "Kuddegedrag maakt bubbels groter en paniek dieper. Daarom helpt een eigen plan om rustig te blijven.",
  },
  {
    id: "bevestiging",
    topic: "psychologie",
    question: "Wat is 'bevestigingsbias'?",
    correct: "Vooral zoeken naar informatie die je eigen mening bevestigt",
    wrong: ["Een bevestigingsmail van je broker", "Een extra controle door de bank", "Een stijgende koers"],
    fact: "Zoek daarom bewust ook naar argumenten tegen je aankoop. Op Beursradar staat bij elke tip een 'Let op'-lijstje.",
  },
  {
    id: "overmoed",
    topic: "psychologie",
    question: "Wat bleek uit onderzoek naar particuliere beleggers die heel vaak handelen?",
    correct: "Ze haalden gemiddeld juist een lager rendement",
    wrong: ["Ze werden allemaal rijk", "Ze betaalden geen kosten", "Ze deden het precies even goed"],
    fact: "Het bekende onderzoek heette 'Trading is hazardous to your wealth': vaak handelen kost geld aan kosten en slechte timing.",
  },
  {
    id: "anker",
    topic: "psychologie",
    question: "Wat is 'ankeren' bij beleggen?",
    correct: "Te veel vasthouden aan een eerder getal, zoals je aankoopprijs",
    wrong: ["Je geld vastzetten op een spaarrekening", "Beleggen in scheepvaart", "Een stop-loss gebruiken"],
    fact: "De markt weet niet wat jij betaald hebt. De vraag is altijd: zou ik dit vandaag opnieuw kopen?",
  },
  {
    id: "paniek",
    topic: "psychologie",
    question: "Waarom is in paniek verkopen tijdens een daling vaak een slecht idee?",
    correct: "Je verkoopt laag en mist vaak het herstel",
    wrong: ["Verkopen is verboden tijdens een daling", "Je krijgt dan geen dividend meer", "Het kost altijd dubbel"],
    fact: "Veel van de beste beursdagen ooit kwamen vlak na de slechtste. Een vooraf gekozen stop-loss is beter dan een paniekbeslissing.",
  },
  {
    id: "recency",
    topic: "psychologie",
    question: "Wat is 'recency bias'?",
    correct: "Denken dat wat net gebeurde gewoon zo doorgaat",
    wrong: ["Alleen nieuwe aandelen kopen", "Een voorkeur voor oude bedrijven", "Elke dag je portfolio bekijken"],
    fact: "Na een paar goede jaren lijkt stijgen normaal, na een crash lijkt alles hopeloos. Allebei duren ze meestal korter dan we denken.",
  },
  {
    id: "mentaal-boekhouden",
    topic: "psychologie",
    question: "Wat is 'mentaal boekhouden'?",
    correct: "Geld anders behandelen afhankelijk van waar het vandaan komt",
    wrong: ["Je boekhouding uit je hoofd doen", "Een cursus voor boekhouders", "Je winst opschrijven in een schrift"],
    fact: "Bijvoorbeeld met 'winstgeld' ineens veel meer risico nemen. Maar elke euro is evenveel waard, waar hij ook vandaan komt.",
  },
  {
    id: "sunk-cost",
    topic: "psychologie",
    question: "Wat is de 'sunk cost'-valkuil?",
    correct: "Doorgaan met iets omdat je er al veel geld in hebt gestoken",
    wrong: ["Geld dat in zee valt", "Kosten voor een duikcursus", "Een bank die zinkt"],
    fact: "Wat je al verloren hebt, krijg je niet terug door langer te wachten. Kijk alleen naar wat nu de beste keuze is.",
  },
  {
    id: "disposition",
    topic: "psychologie",
    question: "Wat doen veel beleggers volgens het 'dispositie-effect'?",
    correct: "Winnaars te snel verkopen en verliezers te lang houden",
    wrong: ["Alles op vrijdag verkopen", "Alleen aandelen van hun werkgever kopen", "Nooit iets verkopen"],
    fact: "Winst pakken voelt goed en verlies nemen doet pijn. Een plan met vooraf een doel én een stop-loss helpt daartegen.",
  },
  {
    id: "plan",
    topic: "psychologie",
    question: "Waarom helpt het om vóór een aankoop al een plan te maken?",
    correct: "Dan beslis je met een rustig hoofd in plaats van in de emotie van het moment",
    wrong: ["Omdat de broker dat verplicht", "Dan betaal je minder belasting", "Dan stijgt de koers sneller"],
    fact: "Daarom geeft Beursradar bij elke tip een instapzone, stop-loss en koersdoel: dan weet je vooraf wat je doet als het misgaat of meezit.",
  },
];

export const QUIZ_EPOCH = Date.UTC(2026, 0, 1);
const DAY_MS = 86_400_000;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Datum als "YYYY-MM-DD" in Nederlandse tijd, zodat de vraag om middernacht wisselt. */
export function dayKey(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

export function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - QUIZ_EPOCH) / DAY_MS);
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Deterministische schudvolgorde zodat het goede antwoord niet altijd op dezelfde plek staat. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Aantal vragen per dag. */
export const QUESTIONS_PER_DAY = 3;
/** Eerste dag van de quiz: vanaf hier kun je eerdere dagen inhalen. */
export const QUIZ_START = "2026-10-16";

export interface QuizItem {
  question: QuizQuestion;
  options: string[];
}

export interface DailyQuiz {
  day: string;
  number: number;
  items: QuizItem[];
}

/** De vragen van een dag: voor iedereen dezelfde, en alle vragen komen langs voordat er een terugkomt. */
export function quizForDay(key: string): DailyQuiz {
  const n = dayNumber(key);
  const items = Array.from({ length: QUESTIONS_PER_DAY }, (_, k) => {
    const slot = n * QUESTIONS_PER_DAY + k;
    const question = QUESTIONS[mod(slot, QUESTIONS.length)];
    return { question, options: seededShuffle([question.correct, ...question.wrong], slot * 31 + 7) };
  });
  return { day: key, number: n + 1, items };
}

export interface QuizAnswer {
  choice: string;
  correct: boolean;
  /** Later ingehaald (niet op de dag zelf): telt niet mee voor de reeks */
  late?: boolean;
}

/** Antwoorden per dag ("YYYY-MM-DD"), per vraag-id. */
export type QuizHistory = Record<string, Record<string, QuizAnswer>>;

/** Score van één dag: alleen vragen die echt bij die dag horen. */
export function dayScore(history: QuizHistory, day: string): { answered: number; correct: number; total: number } {
  const answers = history[day] ?? {};
  const ids = quizForDay(day).items.map((i) => i.question.id);
  const own = ids.filter((id) => answers[id]);
  return { answered: own.length, correct: own.filter((id) => answers[id].correct).length, total: ids.length };
}

/** Aantal dagen op rij gespeeld op de dag zelf, eindigend vandaag (of gisteren als vandaag nog open is). */
export function playStreak(history: QuizHistory, today: string): number {
  const playedOnTime = (day: string) => Object.values(history[day] ?? {}).some((a) => !a.late);
  let day = playedOnTime(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (playedOnTime(day)) {
    streak++;
    day = shiftDay(day, -1);
  }
  return streak;
}

/** Dagen die je nog kunt inhalen of terugkijken, nieuwste eerst (zonder vandaag). */
export function pastDays(today: string, max = 14): string[] {
  const out: string[] = [];
  for (let d = shiftDay(today, -1); d >= QUIZ_START && out.length < max; d = shiftDay(d, -1)) out.push(d);
  return out;
}
