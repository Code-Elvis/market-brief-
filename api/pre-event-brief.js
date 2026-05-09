// api/pre-event-brief.js
// Cron: fires 30 minutes before any HIGH-impact US economic event.
// Fetches the calendar, finds events due in 25-35 minutes, generates
// a one-sentence instrument-specific push notification via Claude Haiku,
// then sends to all KV-stored push subscriptions.
//
// Env vars: FINNHUB_API_KEY, ANTHROPIC_API_KEY, KV_REST_API_URL,
//           KV_REST_API_TOKEN, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

export const config = { maxDuration: 30 };

async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try { const { kv } = await import("@vercel/kv"); return kv; } catch(e) { return null; }
}
async function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY) return null;
  try { const wp = await import("web-push"); return wp.default || wp; } catch(e) { return null; }
}

const KV_SUBSCRIPTIONS = "md:push:subscriptions";

// Instruments most affected by each event type
const EVENT_INSTRUMENT_MAP = {
  "nfp":         ["ES", "Gold", "DXY", "EUR/USD"],
  "payroll":     ["ES", "Gold", "DXY"],
  "cpi":         ["Gold", "DXY", "ES", "EUR/USD"],
  "inflation":   ["Gold", "DXY", "ES"],
  "fomc":        ["ES", "Gold", "DXY", "EUR/USD", "10Y Treasury"],
  "fed":         ["ES", "Gold", "DXY"],
  "gdp":         ["ES", "DXY"],
  "pce":         ["Gold", "DXY"],
  "pmi":         ["ES", "EUR/USD"],
  "ism":         ["ES", "DXY"],
  "retail":      ["ES", "DXY"],
  "jobless":     ["ES", "DXY"],
  "unemployment":["ES", "DXY"],
  "oil":         ["WTI Crude", "ES"],
  "inventory":   ["WTI Crude"],
};

function getAffectedInstruments(eventName) {
  const lower = (eventName || "").toLowerCase();
  for (const [key, insts] of Object.entries(EVENT_INSTRUMENT_MAP)) {
    if (lower.includes(key)) return insts;
  }
  return ["ES", "Gold", "DXY"];
}

async function generatePreEventBrief(event, instruments) {
  const AN_KEY = process.env.ANTHROPIC_API_KEY;
  if (!AN_KEY) return null;
  const sys = "You are a macro market analyst. Write ONE sentence (max 120 chars) explaining what traders should watch for this event and how it is likely to move the named instruments. Direct, specific, no fluff.";
  const msg = `Event: ${event.event} in ~30 minutes (EST: ${event.time_est}). Instruments: ${instruments.slice(0,3).join(", ")}. One sentence pre-event watch.`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": AN_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 150, system: sys, messages: [{ role: "user", content: msg }] }),
  });
  if (!res.ok) return null;
  const d = await res.json();
  return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const FH_KEY = process.env.FINNHUB_API_KEY;
  if (!FH_KEY) return res.status(200).json({ ok: false, reason: "no FINNHUB_API_KEY" });

  try {
    // Fetch live calendar
    const calRes = await fetch(`https://marketdebriefs.com/api/calendar`);
    if (!calRes.ok) throw new Error(`Calendar fetch failed: ${calRes.status}`);
    const calData = await calRes.json();
    const events  = calData.events || [];

    // Find HIGH-impact US events due in 25-35 minutes
    const now = new Date();
    const estNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

    const targetEvents = events.filter(ev => {
      if (ev.passed || ev.country !== "US" || ev.impact !== "high") return false;
      if (!ev.time_est) return false;
      const [h, m] = ev.time_est.split(":").map(Number);
      const evTime = new Date(estNow); evTime.setHours(h, m, 0, 0);
      const diffMin = (evTime - estNow) / 60000;
      return diffMin >= 25 && diffMin <= 35;
    });

    if (!targetEvents.length) {
      return res.status(200).json({ ok: true, sent: 0, reason: "no events in window" });
    }

    const kv       = await getKV();
    const webPush  = await getWebPush();
    if (!kv || !webPush) return res.status(200).json({ ok: true, sent: 0, reason: "KV or WebPush not configured" });

    // Configure VAPID
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:support@marketdebriefs.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Get subscriptions
    const subsRaw = await kv.get(KV_SUBSCRIPTIONS);
    const subs    = Array.isArray(subsRaw) ? subsRaw : [];
    if (!subs.length) return res.status(200).json({ ok: true, sent: 0, reason: "no subscribers" });

    let totalSent = 0;

    for (const ev of targetEvents) {
      const instruments = getAffectedInstruments(ev.event);
      const brief       = await generatePreEventBrief(ev, instruments);
      const title       = `⏰ ${ev.event} in ~30 mins`;
      const body        = brief || `Watch ${instruments.slice(0,2).join(" & ")} for volatility.`;

      const payload = JSON.stringify({
        title,
        body,
        icon:  "/icon-192.png",
        badge: "/icon-192.png",
        tag:   `pre-event-${ev.event.replace(/\s/g, "-").toLowerCase()}`,
        data:  { url: "/app", type: "pre-event", event: ev.event },
      });

      for (const sub of subs) {
        try {
          await webPush.sendNotification(sub, payload);
          totalSent++;
        } catch(e) {
          if (e.statusCode === 410) {
            // Subscription expired — remove it
            const updated = subs.filter(s => s.endpoint !== sub.endpoint);
            await kv.set(KV_SUBSCRIPTIONS, updated);
          }
        }
      }
    }

    return res.status(200).json({ ok: true, sent: totalSent, events: targetEvents.map(e => e.event) });
  } catch(e) {
    console.error("pre-event-brief error:", e.message);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
