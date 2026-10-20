import type { AssetType, NewsItem } from "@/types";
import { cached, fetchText, withFallback } from "./http";
import { mockNews, hashString } from "./mock";
import { scoreText } from "@/lib/nlp/sentiment";

/** Minimalistische RSS 2.0 parser (zonder dependency). */
export function parseRss(xml: string): { title: string; link: string; pubDate: string; description: string; source?: string }[] {
  const items: { title: string; link: string; pubDate: string; description: string; source?: string }[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  for (const match of xml.match(itemRe) ?? []) {
    const get = (tag: string) => {
      const m = match.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? decode(m[1]) : "";
    };
    items.push({
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      description: get("description").replace(/<[^>]+>/g, "").slice(0, 280),
      source: get("source") || undefined,
    });
  }
  return items;
}

function decode(s: string): string {
  return s
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function toNewsItems(rows: ReturnType<typeof parseRss>, publisher: string): NewsItem[] {
  return rows
    .filter((r) => r.title)
    .map((r) => {
      const { score, label } = scoreText(`${r.title}. ${r.description}`);
      const t = Date.parse(r.pubDate);
      return {
        id: `n-${hashString(r.link || r.title)}`,
        title: r.title,
        url: r.link,
        publisher: r.source ?? publisher,
        publishedAt: Number.isFinite(t) ? t : Date.now(),
        summary: r.description || undefined,
        sentiment: label,
        sentimentScore: score,
        source: "live" as const,
      };
    });
}

const CRYPTO_FEEDS = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", publisher: "CoinDesk" },
  { url: "https://cointelegraph.com/rss", publisher: "Cointelegraph" },
  { url: "https://decrypt.co/feed", publisher: "Decrypt" },
];

export async function getNews(symbol: string, name: string, type: AssetType): Promise<{ items: NewsItem[]; live: boolean }> {
  return cached(`news:${type}:${symbol}`, 300, () =>
    withFallback<{ items: NewsItem[]; live: boolean }>(
      [
        async () => {
          if (type === "stock") {
            const xml = await fetchText(
              `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`,
            );
            const items = toNewsItems(parseRss(xml), "Yahoo Finance").slice(0, 12);
            if (!items.length) throw new Error("lege feed");
            return { items, live: true };
          }
          const results = await Promise.allSettled(
            CRYPTO_FEEDS.map(async (f) => toNewsItems(parseRss(await fetchText(f.url)), f.publisher)),
          );
          const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
          if (!all.length) throw new Error("geen crypto-feeds bereikbaar");
          const keywords = [symbol.toLowerCase(), name.toLowerCase()];
          const specific = all.filter((n) => {
            const t = ` ${n.title.toLowerCase()} ${(n.summary ?? "").toLowerCase()} `;
            return keywords.some((k) => t.includes(` ${k} `) || t.includes(` ${k}'`) || t.includes(`${k},`) || t.includes(` ${k}:`));
          });
          const items = (specific.length >= 3 ? specific : all).sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 12);
          return { items, live: true };
        },
      ],
      () => ({ items: mockNews(symbol, name, type), live: false }),
      `news ${symbol}`,
    ),
  );
}

/** Eén RSS-feed als nieuwsberichten, 5 minuten gecachet. */
export async function getFeed(url: string, publisher: string): Promise<NewsItem[]> {
  return cached(`feed:${url}`, 300, async () => toNewsItems(parseRss(await fetchText(url)), publisher));
}

const MARKET_FEEDS = {
  /** Nederlands economienieuws */
  nl: [{ url: "https://feeds.nos.nl/nosnieuwseconomie", publisher: "NOS" }],
  /** Wall Street en de wereldwijde beurzen */
  world: [{ url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,SPY,QQQ,%5EDJI&region=US&lang=en-US", publisher: "Yahoo Finance" }],
  crypto: CRYPTO_FEEDS,
};

/** Algemeen marktnieuws voor de krant: Nederlands, internationaal en crypto. */
export async function getMarketNews(): Promise<{ nl: NewsItem[]; world: NewsItem[]; crypto: NewsItem[]; live: boolean }> {
  const load = async (feeds: { url: string; publisher: string }[], max: number) => {
    const res = await Promise.allSettled(feeds.map((f) => getFeed(f.url, f.publisher)));
    const all = res.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const seen = new Set<string>();
    return all
      .filter((n) => (seen.has(n.title) ? false : (seen.add(n.title), true)))
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, max);
  };
  const [nl, world, crypto] = await Promise.all([load(MARKET_FEEDS.nl, 10), load(MARKET_FEEDS.world, 10), load(MARKET_FEEDS.crypto, 8)]);
  if (!nl.length && !world.length && !crypto.length) {
    // Geen enkele feed bereikbaar: voorbeeldberichten, duidelijk als mock gemarkeerd
    return { nl: [], world: mockNews("SPY", "S&P 500", "stock").slice(0, 6), crypto: mockNews("BTC", "Bitcoin", "crypto").slice(0, 4), live: false };
  }
  return { nl, world, crypto, live: true };
}
