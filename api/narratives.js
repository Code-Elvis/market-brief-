// api/narratives.js
// Generates breaking narratives via Claude + Finnhub.
// No KV dependency - direct Claude call every time.
// KV caching will be added once @vercel/kv is in package.json.

import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  let articles = [];

  try {
    const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60;
    const r = await fetch(
      `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FINNHUB_KEY}`,
      { headers: { "User-Agent": "MarketDebriefs/1.0" } }
    );
    const raw = await r.json();
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
3. instruments: 3-5 most directly affected markets with specific impact per instrument
4. narrative_summary: 2-3 sentences max, institutional tone
5. tensions: cross-asset conflicts or contradictions in the current narrative
6. watch_for: specific triggers to monitor in next few hours
7. fades_when: what resolves or invalidates this narrative`;

  const msg = `Current time: ${new Date().toUTCString()}. Analyze these breaking headlines and generate macro narrative briefs:\n\n${headlines}\n\nGenerate narrative cards for the 4 most market-moving stories. For each, identify which instruments are affected and how.`;

  try {
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
    const parsed = JSON.parse(cleaned);

    return res.status(200).json({
      narratives: parsed.narratives || [],
      fetched_at: new Date().toISOString(),
      count: (parsed.narratives || []).length,
      cached: false,
    });
  } catch (e) {
    console.error("Narratives generation failed:", e.message);
    return res.status(500).json({ error: e.message, narratives: [] });
  }
}
