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

export interface DailyQuiz {
  day: string;
  number: number;
  question: QuizQuestion;
  options: string[];
}

export function quizForDay(key: string): DailyQuiz {
  const n = dayNumber(key);
  const question = QUESTIONS[mod(n, QUESTIONS.length)];
  const options = seededShuffle([question.correct, ...question.wrong], n * 31 + 7);
  return { day: key, number: n + 1, question, options };
}

export interface QuizRecord {
  questionId: string;
  choice: string;
  correct: boolean;
}

/** Aantal dagen op rij gespeeld, eindigend vandaag (of gisteren als vandaag nog open is). */
export function playStreak(history: Record<string, QuizRecord>, today: string): number {
  let day = history[today] ? today : shiftDay(today, -1);
  let streak = 0;
  while (history[day]) {
    streak++;
    day = shiftDay(day, -1);
  }
  return streak;
}
