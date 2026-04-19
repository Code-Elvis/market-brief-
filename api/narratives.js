// api/narratives.js
// Generates breaking narratives via Claude + Finnhub.
// KV caching is enabled only when @vercel/kv is installed (Vercel Pro + KV storage set up).
// Until then, falls back to direct Claude call every time - same as original behaviour.

import Anthropic from "@anthropic-ai/sdk";

const CACHE_TTL_MS = 16 * 60 * 1000;
const KV_KEY = "md:narratives:latest";

async function getKV() {
  // Only attempt KV if the env vars exist (set automatically when Vercel KV is connected)
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch (e) {
    return null;
  }
}

async function generateNarratives() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  let articles = [];

  try {
    const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60;
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FINNHUB_KEY}`,
      { headers: { "User-Agent": "MarketDebriefs/1.0" } }
    );
    const raw = await res.json();
    console.log(`Finnhub returned ${Array.isArray(raw) ? raw.length : 0} articles`);
    articles = (Array.isArray(raw) ? raw : [])
      .filter(a => a.datetime >= Math.floor(Date.now() / 1000) - 6 * 60 * 60)
      .slice(0, 20);
  } catch (e) {
    console.error("Finnhub fetch failed:", e.message);
  }

  const headlines = articles.length > 0
    ? articles.map(a => `- ${a.headline} (${a.source})`).join("\n")
    : "No recent headlines available. Generate 3-4 current macro narratives based on recent market conditions.";

  const sys = `You are a professional macro market intelligence analyst. Analyze breaking financial news and generate institutional-quality narrative briefs. Return ONLY valid JSON - no markdown, no preamble.

SCHEMA: {"narratives":[{"id":"string","headline":"string","source":"string","url":"string","published_at":0,"age":"string","tag":"WIRE|MACRO|POLITICAL|CENTRAL_BANK|EARNINGS","political_alert":false,"narrative_summary":"string","urgency":"CRITICAL|HIGH|MEDIUM|LOW","instruments":[{"name":"string","flow":"DEMAND|PRESSURE|VOLATILE|WATCH","impact":"string"}],"tensions":"string","watch_for":"string","fades_when":"string"}]}

RULES:
1. political_alert: true ONLY for: military conflict, geopolitical escalation, sanctions, emergency Fed action, systemic financial risk
2. urgency: CRITICAL=market moving right now, HIGH=significant within hours, MEDIUM=relevant today, LOW=background
3. instruments: 3-5 most directly affected markets
4. narrative_summary: 2-3 sentences maximum, institutional tone
5. tensions: cross-asset conflicts or contradictions
6. watch_for: specific triggers to monitor
7. fades_when: what resolves this narrative`;

  const msg = `Current time: ${new Date().toUTCString()}. Analyze these breaking headlines and generate macro narrative briefs:\n\n${headlines}\n\nGenerate narrative cards for the 4 most market-moving stories.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: msg }],
    system: sys,
  });

  const text = (response.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const force = req.query?.force === "true";

  // Try KV cache first (only if KV is configured)
  const kv = await getKV();
  if (kv && !force) {
    try {
      const cached = await kv.get(KV_KEY);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        const age = Date.now() - new Date(parsed.fetched_at).getTime();
        if (age < CACHE_TTL_MS) {
          console.log(`Serving from KV cache (${Math.round(age / 1000)}s old)`);
          return res.status(200).json({ ...parsed, cached: true, cache_age_seconds: Math.round(age / 1000) });
        }
      }
    } catch (e) {
      console.log("KV read failed, fetching fresh:", e.message);
    }
  }

  // Direct Claude call
  try {
    const result = await generateNarratives();
    const payload = {
      narratives: result.narratives || [],
      fetched_at: new Date().toISOString(),
      count: (result.narratives || []).length,
      cached: false,
    };

    // Write to KV if available
    if (kv) {
      try {
        await kv.set(KV_KEY, JSON.stringify(payload), { ex: 1200 });
      } catch (e) {
        console.log("KV write failed (non-fatal):", e.message);
      }
    }

    return res.status(200).json(payload);
  } catch (e) {
    console.error("Narratives generation failed:", e.message);
    return res.status(500).json({ error: e.message, narratives: [] });
  }
}
