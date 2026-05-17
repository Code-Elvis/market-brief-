// api/narratives-cron.js
// Runs every 15 minutes via Vercel Cron.
// Uses fetch() for Anthropic — no @anthropic-ai/sdk import needed.

export const config = { maxDuration: 30 };

async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try { const { kv } = await import("@vercel/kv"); return kv; } catch(e) { return null; }
}
async function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY) return null;
  try { const wp = await import("web-push"); return wp.default || wp; } catch(e) { return null; }
}

const KV_NARRATIVES_KEY = "md:narratives:latest";
const KV_SEEN_IDS_KEY   = "md:narratives:seen_ids";
const KV_SUBSCRIPTIONS  = "md:push:subscriptions";

async function fetchNarrativesFromClaude() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  let articles = [];

  try {
    const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60;
    const res   = await fetch(
      `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FINNHUB_KEY}`,
      { headers: { "User-Agent": "MarketDebriefs/1.0" } }
    );
    const raw = await res.json();
    articles = (Array.isArray(raw) ? raw : [])
      .filter(a => a.datetime >= since)
      .slice(0, 20);
  } catch(e) {
    console.error("Finnhub fetch failed:", e.message);
  }

  const headlines = articles.length > 0
    ? articles.map(a => `- ${a.headline} (${a.source})`).join("\n")
    : "No recent headlines. Generate 4 current macro narratives based on recent conditions.";

  const sys = `You are a professional macro market intelligence analyst. Return ONLY valid JSON.\nSCHEMA: {"narratives":[{"id":"string","headline":"string","source":"string","url":"string","published_at":0,"age":"string","tag":"WIRE|MACRO|POLITICAL|CENTRAL_BANK|EARNINGS","political_alert":false,"narrative_summary":"string","urgency":"CRITICAL|HIGH|MEDIUM|LOW","instruments":[{"name":"string","flow":"DEMAND|PRESSURE|VOLATILE|WATCH","impact":"string"}],"tensions":"string","watch_for":"string","fades_when":"string"}]}\nRULES: political_alert only for military/geopolitical escalation/emergency Fed action. urgency: CRITICAL=market moving now, HIGH=significant within hours. 3-5 instruments per narrative.`;

  const msg = `Current time: ${new Date().toUTCString()}. Analyze these headlines and generate 4 macro narrative briefs:\n\n${headlines}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: sys,
      messages: [{ role: "user", content: msg }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

async function sendPushNotifications(narrative, kv, webPush) {
  if (!webPush || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log("VAPID not configured — skipping push");
    return 0;
  }
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@marketdebriefs.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  let subscriptions = [];
  try { subscriptions = (await kv.get(KV_SUBSCRIPTIONS)) || []; }
  catch(e) { console.error("Failed to load subscriptions:", e.message); return 0; }

  if (!subscriptions.length) { console.log("No subscribers"); return 0; }

  const payload = JSON.stringify({
    title: "MarketDebriefs — Breaking Alert",
    body:  narrative.headline,
    icon:  "/icon-192.png",
    badge: "/icon-192.png",
    tag:   "breaking-narrative",
    data:  { url: "/app", urgency: narrative.urgency },
  });

  let sent = 0;
  const dead = [];
  for (const sub of subscriptions) {
    // sub may be { subscription: {...}, watchList: [...] } (new format) or raw subscription (old format)
    const pushSub = sub.subscription || sub;
    try {
      await webPush.sendNotification(pushSub, payload);
      sent++;
    } catch(e) {
      if (e.statusCode === 410 || e.statusCode === 404) dead.push(pushSub.endpoint);
    }
  }

  if (dead.length > 0) {
    const cleaned = subscriptions.filter(s => !dead.includes((s.subscription || s).endpoint));
    await kv.set(KV_SUBSCRIPTIONS, cleaned);
    console.log(`Removed ${dead.length} dead subscriptions`);
  }

  console.log(`Push sent to ${sent} subscribers`);
  return sent;
}

export default async function handler(req, res) {
  // Cron auth check — Vercel sets Authorization: Bearer <CRON_SECRET>
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const now   = new Date();
  const hour  = now.getUTCHours();
  const quiet = hour >= 3 && hour < 10;
  console.log(`narratives-cron at ${now.toISOString()} quiet=${quiet}`);

  const kv      = await getKV();
  const webPush = await getWebPush();

  if (!kv) {
    console.log("KV not available");
    return res.status(200).json({ ok: false, reason: "KV not available" });
  }

  try {
    const result     = await fetchNarrativesFromClaude();
    const narratives = result.narratives || [];

    // Write to KV cache
    await kv.set(KV_NARRATIVES_KEY, JSON.stringify({
      narratives, fetched_at: now.toISOString(), count: narratives.length, cached: false,
    }), { ex: 1200 });

    // Find new narrative IDs
    const seenIds  = (await kv.get(KV_SEEN_IDS_KEY)) || [];
    const seenSet  = new Set(seenIds);
    const newOnes  = narratives.filter(n => !seenSet.has(n.id));

    // Fire push for new political alerts + CRITICAL + HIGH
    const EMERGENCY = ["emergency","circuit breaker","halt","crash","ceasefire","invasion","attack","nuclear","systemic"];
    const isEmergency = n => EMERGENCY.some(k =>
      (n.headline + n.narrative_summary).toLowerCase().includes(k)
    );

    const toNotify = newOnes.filter(n =>
      n.political_alert || n.urgency === "CRITICAL" || n.urgency === "HIGH"
    );

    let totalPushed = 0;
    for (const n of toNotify) {
      if (!quiet || isEmergency(n)) {
        totalPushed += await sendPushNotifications(n, kv, webPush);
      }
    }

    // Update seen IDs
    const allIds = [...seenIds, ...newOnes.map(n => n.id)].slice(-200);
    await kv.set(KV_SEEN_IDS_KEY, allIds);

    console.log(`Done: ${narratives.length} narratives, ${toNotify.length} alerts, ${totalPushed} pushed`);
    return res.status(200).json({ ok: true, narratives: narratives.length, pushed: totalPushed });

  } catch(e) {
    console.error("narratives-cron error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
