// api/narratives.js
// Fetches macro-relevant news from Finnhub (free, no article limit)
// Interprets via Claude Haiku and caches server-side for 15 minutes.
//
// Env vars: FINNHUB_API_KEY, ANTHROPIC_API_KEY

export const config = { maxDuration: 30 };

let cache = { narratives: [], fetched_at: null, ttl_ms: 15 * 60 * 1000 };

function isCacheValid() {
  return cache.fetched_at && cache.narratives.length > 0 &&
    Date.now() - cache.fetched_at < cache.ttl_ms;
}

// Macro-relevant keywords — stories must contain at least one
const MACRO_KEYWORDS = [
  "federal reserve","fed ","powell","fomc","interest rate","rate cut","rate hike",
  "tariff","trump","sanctions","iran","israel","war","military","airstrike",
  "inflation","cpi","pce","nfp","payrolls","gdp","recession","unemployment",
  "opec","crude oil","brent","wti","natural gas",
  "gold","silver","dollar","dxy","yen","euro","pound","yuan",
  "treasury","yields","10-year","bond",
  "central bank","bank of england","ecb","boj","pboc",
  "geopolit","conflict","escalat","de-escalat","ceasefire",
  "market crash","stock market rout","sell-off","risk-off","flight to safety",
];

// Equity noise — reject these even if they contain macro words
const EQUITY_NOISE = [
  "buyback","share repurchase","quarterly earnings","earnings per share",
  "analyst upgrade","analyst downgrade","price target","ipo ","acquisition",
  "ceo appoint","board of directors","dividend declared","proxy",
  "annual report","10-k","10-q",
];

// Political/Trump market alerts — highest priority tier
const POLITICAL_ALERT_KEYWORDS = [
  "trump", "tariff", "trade war", "trade deal", "executive order",
  "truth social", "trump post", "trump says", "trump threatens",
  "white house", "oval office", "president trump",
  "sanctions", "trade policy", "import tax", "export ban",
  "nato", "ukraine aid", "israel strike", "iran strike",
  "market tariff", "reciprocal tariff", "trump tariff",
];

function isPoliticalAlert(title) {
  if (!title) return false;
  const l = title.toLowerCase();
  return POLITICAL_ALERT_KEYWORDS.some(kw => l.includes(kw));
}

function isMacroRelevant(title) {
  if (!title) return false;
  const l = title.toLowerCase();
  if (EQUITY_NOISE.some(n => l.includes(n))) return false;
  return MACRO_KEYWORDS.some(kw => l.includes(kw));
}

async function interpretHeadline(headline, apiKey) {
  const sys = `You are a macro market interpreter. Respond ONLY with valid JSON. No markdown.
RULES: No price levels. Instrument flows only: DEMAND|PRESSURE|VOLATILE|WATCH — never BULLISH/BEARISH.
Flag cross-instrument tensions explicitly.
SCHEMA: {"narrative_summary":"string","urgency":"CRITICAL|HIGH|MEDIUM","instruments":[{"name":"string","flow":"DEMAND|PRESSURE|VOLATILE|WATCH","impact":"string"}],"tensions":"string","watch_for":"string","fades_when":"string"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: sys,
      messages: [{ role: "user", content: `Headline: "${headline}". Interpret for macro traders.` }],
    }),
  });

  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  return JSON.parse(match[0]);
}

function getAge(ts) {
  // Finnhub returns Unix timestamps
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate");

  const force = req.query?.force === "true";

  if (!force && isCacheValid()) {
    return res.status(200).json({
      narratives: cache.narratives.map(n => ({ ...n, age: getAge(n.published_at) })),
      fetched_at: new Date(cache.fetched_at).toISOString(),
      cached: true,
    });
  }

  const FH_KEY = process.env.FINNHUB_API_KEY;
  const AN_KEY = process.env.ANTHROPIC_API_KEY;

  if (!FH_KEY) {
    return res.status(200).json({
      narratives: [],
      error: "FINNHUB_API_KEY not set in Vercel environment variables",
    });
  }

  try {
    // Finnhub general market news — no article limit on free tier
    const url = `https://finnhub.io/api/v1/news?category=general&token=${FH_KEY}`;
    const newsRes = await fetch(url);
    if (!newsRes.ok) throw new Error(`Finnhub ${newsRes.status}`);
    const articles = await newsRes.json();

    console.log(`Finnhub returned ${articles.length} articles`);

    // Filter to macro-relevant only
    const filtered = articles
      .filter(a => isMacroRelevant(a.headline))
      .slice(0, 6);

    console.log(`After macro filter: ${filtered.length} articles`);
    if (filtered.length > 0) {
      console.log("Headlines:", filtered.map(a => a.headline).join(" | "));
    }

    if (!filtered.length) {
      cache = { narratives: [], fetched_at: Date.now(), ttl_ms: cache.ttl_ms };
      return res.status(200).json({
        narratives: [],
        fetched_at: new Date().toISOString(),
        message: "No macro-relevant headlines in current news cycle",
      });
    }

    // Interpret via Claude Haiku
    const settled = await Promise.allSettled(
      filtered.map(async a => {
        try {
          const interp = await interpretHeadline(a.headline, AN_KEY);
          return {
          const political = isPoliticalAlert(a.headline);
          return {
            id: String(a.id || `fh-${Date.now()}-${Math.random().toString(36).slice(2,6)}`),
            headline: a.headline,
            source: a.source || "Finnhub",
            url: a.url,
            published_at: a.datetime,
            age: getAge(a.datetime),
            tag: political ? "POLITICAL_ALERT" : "WIRE",
            political_alert: political,
            ...interp,
            urgency: political && interp.urgency !== "CRITICAL" ? "CRITICAL" : interp.urgency,
          };
        } catch(e) {
          console.error("interpret failed:", e.message);
          return null;
        }
      })
    );

    const narratives = settled
      .filter(r => r.status === "fulfilled" && r.value)
      .map(r => r.value)
      .sort((a, b) => {
        // Political alerts always float to top
        if (a.political_alert && !b.political_alert) return -1;
        if (!a.political_alert && b.political_alert) return 1;
        return b.published_at - a.published_at;
      });

    cache = { narratives, fetched_at: Date.now(), ttl_ms: cache.ttl_ms };

    return res.status(200).json({
      narratives,
      fetched_at: new Date().toISOString(),
      count: narratives.length,
      cached: false,
    });

  } catch(err) {
    console.error("narratives error:", err.message);
    if (cache.narratives.length) {
      return res.status(200).json({
        narratives: cache.narratives,
        cached: true,
        error: err.message,
      });
    }
    return res.status(200).json({ narratives: [], error: err.message });
  }
}
