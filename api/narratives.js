// api/narratives.js
// Server-side cached narratives — one Marketaux call per 30 mins
// ALL users read from same cache. 100 requests/day = plenty.
//
// Env vars: MARKETAUX_API_KEY, ANTHROPIC_API_KEY

export const config = { maxDuration: 30 };

let cache = { narratives: [], fetched_at: null, ttl_ms: 30 * 60 * 1000 };

function isCacheValid() {
  return cache.fetched_at && cache.narratives.length > 0 &&
    Date.now() - cache.fetched_at < cache.ttl_ms;
}

const HIGH_IMPACT = [
  "fed","federal reserve","powell","fomc","rate decision",
  "tariff","trump","sanctions","iran","israel","war","military",
  "inflation","cpi","nfp","payroll","gdp","recession",
  "opec","oil production","crude","gold","dollar index",
  "yields","treasury","bond","central bank",
  "emergency","crisis","crash","surge","plunge","spike","escalat",
];

function isHighImpact(h) {
  const l = h.toLowerCase();
  return HIGH_IMPACT.some(kw => l.includes(kw));
}

async function interpretHeadline(headline, apiKey) {
  const sys = `You are a macro market interpreter. Respond ONLY with valid JSON. No markdown.
RULES: No price levels. Flows only: DEMAND|PRESSURE|VOLATILE|WATCH — never BULLISH/BEARISH.
Flag cross-instrument tensions (e.g. Dollar strength vs Gold).
SCHEMA: {"narrative_summary":"string","urgency":"CRITICAL|HIGH|MEDIUM","instruments":[{"name":"string","flow":"DEMAND|PRESSURE|VOLATILE|WATCH","impact":"string"}],"tensions":"string","watch_for":"string","fades_when":"string"}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", max_tokens: 500, system: sys,
      messages: [{ role: "user", content: `Headline: "${headline}". Interpret for macro traders.` }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  return JSON.parse(match[0]);
}

function getAge(iso) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ago`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");

  // Serve from cache if still valid — costs 0 Marketaux requests
  if (isCacheValid()) {
    return res.status(200).json({
      narratives: cache.narratives.map(n => ({ ...n, age: getAge(n.published_at) })),
      fetched_at: new Date(cache.fetched_at).toISOString(),
      cached: true,
      next_refresh_in: Math.ceil((cache.ttl_ms - (Date.now() - cache.fetched_at)) / 60000) + "m",
    });
  }

  const MX_KEY = process.env.MARKETAUX_API_KEY;
  const AN_KEY = process.env.ANTHROPIC_API_KEY;

  if (!MX_KEY) return res.status(200).json({ narratives: [], error: "MARKETAUX_API_KEY not set in Vercel" });

  try {
    const since = new Date(Date.now() - 2*60*60*1000).toISOString().replace(/\.\d{3}Z$/,"");
    const url = `https://api.marketaux.com/v1/news/all?language=en&filter_entities=true&limit=20&published_after=${since}&api_token=${MX_KEY}`;
    const newsRes = await fetch(url);
    if (!newsRes.ok) throw new Error(`Marketaux ${newsRes.status}`);
    const { data: articles = [] } = await newsRes.json();

    const filtered = articles.filter(a => a.title && isHighImpact(a.title)).slice(0, 6);
    if (!filtered.length) {
      cache = { narratives: [], fetched_at: Date.now(), ttl_ms: cache.ttl_ms };
      return res.status(200).json({ narratives: [], fetched_at: new Date().toISOString() });
    }

    const settled = await Promise.allSettled(filtered.map(async a => {
      try {
        const interp = await interpretHeadline(a.title, AN_KEY);
        return { id: a.uuid||`w-${Date.now()}`, headline: a.title, source: a.source||"Wire",
          published_at: a.published_at, age: getAge(a.published_at), tag: "WIRE", ...interp };
      } catch { return null; }
    }));

    const narratives = settled
      .filter(r => r.status==="fulfilled" && r.value)
      .map(r => r.value)
      .sort((a,b) => new Date(b.published_at) - new Date(a.published_at));

    cache = { narratives, fetched_at: Date.now(), ttl_ms: cache.ttl_ms };
    return res.status(200).json({ narratives, fetched_at: new Date().toISOString(), count: narratives.length, cached: false });

  } catch(err) {
    console.error("narratives:", err.message);
    if (cache.narratives.length) return res.status(200).json({ narratives: cache.narratives, cached: true, error: err.message });
    return res.status(200).json({ narratives: [], error: err.message });
  }
}
