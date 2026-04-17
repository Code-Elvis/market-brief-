// api/narratives-cron.js
// Runs every 15 minutes via Vercel Cron. Fetches narratives once for ALL users,
// writes to KV cache, detects new political alerts, fires push notifications.

import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import webpush from "web-push";

const KV_NARRATIVES_KEY  = "md:narratives:latest";
const KV_SEEN_IDS_KEY    = "md:narratives:seen_ids";
const KV_SUBSCRIPTIONS   = "md:push:subscriptions";

// ── Narrative generation (same logic as narratives.js) ─────────────────────
async function fetchNarrativesFromClaude() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  let articles = [];

  try {
    const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60;
    const now   = Math.floor(Date.now() / 1000);
    const res   = await fetch(
      `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FINNHUB_KEY}`,
      { headers: { "User-Agent": "MarketDebriefs/1.0" } }
    );
    const raw = await res.json();
    articles = (Array.isArray(raw) ? raw : [])
      .filter(a => a.datetime >= since)
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
5. tensions: cross-asset conflicts/contradictions
6. watch_for: specific triggers to monitor
7. fades_when: what resolves this narrative`;

  const msg = `Current time: ${new Date().toUTCString()}. Analyze these breaking headlines and generate macro narrative briefs:\n\n${headlines}\n\nGenerate narrative cards for the 4 most market-moving stories. For each, identify which instruments are affected and how.`;

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

// ── Push notification sender ────────────────────────────────────────────────
async function sendPushNotifications(narrative) {
  const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const VAPID_EMAIL   = process.env.VAPID_EMAIL || "mailto:support@marketdebriefs.com";

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log("VAPID keys not set - skipping push notifications");
    return;
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

  let subscriptions = [];
  try {
    subscriptions = (await kv.get(KV_SUBSCRIPTIONS)) || [];
  } catch (e) {
    console.error("Failed to load subscriptions:", e.message);
    return;
  }

  if (!subscriptions.length) {
    console.log("No push subscriptions found");
    return;
  }

  const payload = JSON.stringify({
    title: "MarketDebriefs  -  Breaking Alert",
    body: narrative.headline,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "breaking-narrative",
    url: "https://marketdebriefs.com/app",
    urgency: narrative.urgency,
  });

  // Fire to all subscribers, remove dead ones
  const results = await Promise.allSettled(
    subscriptions.map(sub => webpush.sendNotification(sub, payload))
  );

  // Clean up expired subscriptions (410 = gone, 404 = not found)
  const validSubs = subscriptions.filter((_, i) => {
    const r = results[i];
    if (r.status === "rejected") {
      const status = r.reason?.statusCode;
      return status !== 410 && status !== 404;
    }
    return true;
  });

  if (validSubs.length !== subscriptions.length) {
    await kv.set(KV_SUBSCRIPTIONS, validSubs);
    console.log(`Cleaned ${subscriptions.length - validSubs.length} dead subscriptions`);
  }

  console.log(`Push sent to ${validSubs.length} subscribers`);
}

// ── Main handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Verify this was called by Vercel cron
  const authHeader = req.headers.authorization;
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const hour = now.getUTCHours();
  // Quiet hours: 03:00 - 10:00 UTC (approx 10pm - 6am EST)
  const isQuietHours = hour >= 3 && hour < 10;

  console.log(`Narratives cron running at ${now.toISOString()}, quiet=${isQuietHours}`);

  try {
    // 1. Fetch fresh narratives from Claude
    const result = await fetchNarrativesFromClaude();
    const narratives = result.narratives || [];

    // 2. Get previously seen IDs from KV
    let seenIds = [];
    try {
      seenIds = (await kv.get(KV_SEEN_IDS_KEY)) || [];
    } catch (e) {
      console.log("No seen IDs yet (first run)");
    }

    // 3. Find genuinely new narratives
    const seenSet   = new Set(seenIds);
    const newOnes   = narratives.filter(n => !seenSet.has(n.id));
    const newAlerts = newOnes.filter(n => n.political_alert === true);

    // Emergency keywords override quiet hours
    const EMERGENCY_KEYWORDS = [
      "emergency", "circuit breaker", "halt", "crash", "ceasefire",
      "invasion", "attack", "nuclear", "rate cut emergency", "systemic"
    ];
    const isEmergency = (n) => EMERGENCY_KEYWORDS.some(k =>
      n.headline?.toLowerCase().includes(k) ||
      n.narrative_summary?.toLowerCase().includes(k)
    );

    // 4. Write to KV cache with timestamp
    const cachePayload = {
      narratives,
      fetched_at: now.toISOString(),
      count: narratives.length,
      cached: false,
    };
    await kv.set(KV_NARRATIVES_KEY, JSON.stringify(cachePayload), { ex: 1200 }); // 20min expiry

    // 5. Fire push notifications for new political alerts
    if (newAlerts.length > 0) {
      for (const alert of newAlerts) {
        const shouldNotify = !isQuietHours || isEmergency(alert);
        if (shouldNotify) {
          console.log(`Firing push for: ${alert.headline}`);
          await sendPushNotifications(alert);
        } else {
          console.log(`Quiet hours - skipping push for: ${alert.headline}`);
        }
      }
    }

    // 6. Update seen IDs (keep last 200 to prevent unbounded growth)
    const allIds = [...seenIds, ...newOnes.map(n => n.id)].slice(-200);
    await kv.set(KV_SEEN_IDS_KEY, allIds);

    console.log(`Done. ${narratives.length} narratives, ${newAlerts.length} new alerts`);

    return res.status(200).json({
      ok: true,
      narratives: narratives.length,
      new_alerts: newAlerts.length,
      pushed: newAlerts.length > 0,
      fetched_at: now.toISOString(),
    });

  } catch (e) {
    console.error("Cron error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
