// api/narratives-cron.js
// Triggered by Vercel Cron every 15 minutes during market hours.
// 1. Fetches Finnhub headlines
// 2. Generates narrative cards via Claude Haiku (fetch, no SDK)
// 3. Detects NEW high-urgency / political narratives
// 4. Fires push notifications to subscribed users
// No @anthropic-ai/sdk import — uses fetch() directly.

export const config = { maxDuration: 45 };

// ── Lazy loaders ──────────────────────────────────────────────────────────────
async function getKV() {
  if (!process.env.KV_REST_API_URL) return null;
  try { const m = await import("@vercel/kv"); return m.kv; } catch(e) { return null; }
}
async function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY) return null;
  try { const m = await import("web-push"); return m.default || m; } catch(e) { return null; }
}

const KV_SUBS    = "md:push:subs";
const KV_CACHE   = "md:narratives:latest";
const KV_SEEN    = "md:narratives:seen";

// ── Fetch narratives from Claude Haiku ────────────────────────────────────────
async function generateNarratives() {
  // 1. Get Finnhub headlines
  let headlines = "No recent headlines available.";
  try {
    const since = Math.floor(Date.now() / 1000) - 6 * 3600;
    const r = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${process.env.FINNHUB_API_KEY}`,
      { headers: { "User-Agent": "MarketDebriefs/1.0" } }
    );
    const items = await r.json();
    const fresh = (Array.isArray(items) ? items : []).filter(a => a.datetime >= since).slice(0, 20);
    if (fresh.length) headlines = fresh.map(a => `- ${a.headline} (${a.source})`).join("\n");
  } catch(e) { console.error("Finnhub error:", e.message); }

  // 2. Call Anthropic via fetch
  const sys = `You are a professional macro market intelligence analyst. Return ONLY valid JSON, no markdown.
SCHEMA: {"narratives":[{"id":"string","headline":"string","age":"string","tag":"WIRE|MACRO|POLITICAL|CENTRAL_BANK","political_alert":false,"narrative_summary":"string","urgency":"CRITICAL|HIGH|MEDIUM|LOW","instruments":[{"name":"string","flow":"DEMAND|PRESSURE|VOLATILE|WATCH","impact":"string"}],"watch_for":"string","fades_when":"string"}]}
RULES: political_alert=true ONLY for military conflict/geopolitical escalation/emergency Fed action. urgency CRITICAL=moving markets now, HIGH=significant within hours.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system: sys,
      messages: [{ role: "user", content: `Time: ${new Date().toUTCString()}\n\n${headlines}\n\nGenerate 4 narrative cards for the most market-moving stories.` }],
    }),
  });

  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const d    = await r.json();
  const text = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const json = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(json);
}

// ── Send a push notification to all subscribers ───────────────────────────────
async function pushToAll(narrative, subs, webPush) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:support@marketdebriefs.com`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({
    title: narrative.political_alert ? "🔴 Political Alert — MarketDebriefs" : "⚡ Breaking — MarketDebriefs",
    body:  narrative.headline.slice(0, 120),
    icon:  "/icon-192.png",
    badge: "/icon-192.png",
    tag:   `md-narrative-${Date.now()}`,
    data:  { url: "/app", urgency: narrative.urgency },
  });

  let sent = 0; const dead = [];
  for (const sub of subs) {
    // Scope: if subscriber has a watchList, only notify if an affected instrument matches
    if (sub.watchList?.length > 0 && narrative.instruments?.length > 0) {
      const affected = narrative.instruments.map(i => i.name.toLowerCase());
      const watched  = sub.watchList.map(k => k.toLowerCase());
      const match    = affected.some(a => watched.some(w => a.includes(w) || w.includes(a)));
      if (!match) continue;
    }
    try {
      await webPush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
      sent++;
    } catch(e) {
      if (e.statusCode === 410 || e.statusCode === 404) dead.push(sub.endpoint);
      else console.error("Push error:", e.message);
    }
  }
  return { sent, dead };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth: only enforce if CRON_SECRET is actually set
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now   = new Date();
  const hour  = now.getUTCHours();
  // Quiet hours 02:00–12:00 UTC (roughly 10pm–8am ET) — no push except emergencies
  const quiet = hour >= 2 && hour < 12;
  console.log(`narratives-cron ${now.toISOString()} quiet=${quiet}`);

  const db      = await getKV();
  const webPush = await getWebPush();

  if (!db) {
    console.error("KV unavailable — aborting");
    return res.status(200).json({ ok: false, reason: "KV unavailable" });
  }

  try {
    // Generate fresh narratives
    const result     = await generateNarratives();
    const narratives = result.narratives || [];
    console.log(`Generated ${narratives.length} narratives`);

    // Write to KV cache for the client app to read
    await db.set(KV_CACHE, JSON.stringify({
      narratives,
      fetched_at: now.toISOString(),
      count: narratives.length,
    }), { ex: 900 }); // 15 min TTL

    // Detect genuinely new narratives by ID
    const seen    = new Set((await db.get(KV_SEEN)) || []);
    const newOnes = narratives.filter(n => !seen.has(n.id));
    console.log(`New narratives: ${newOnes.length}`);

    // Alert-worthy = political OR CRITICAL or HIGH urgency
    const EMERGENCY_KW = ["emergency","halt","crash","invasion","attack","nuclear","systemic","ceasefire"];
    const isEmergency  = n => EMERGENCY_KW.some(k => (n.headline + " " + (n.narrative_summary || "")).toLowerCase().includes(k));

    const toAlert = newOnes.filter(n =>
      n.political_alert || n.urgency === "CRITICAL" || n.urgency === "HIGH"
    );

    // Push notifications
    let totalPushed = 0;
    if (toAlert.length > 0 && webPush && process.env.VAPID_PRIVATE_KEY) {
      const subs = (await db.get(KV_SUBS)) || [];
      console.log(`Subscribers: ${subs.length}`);

      for (const n of toAlert) {
        if (quiet && !isEmergency(n)) {
          console.log(`Quiet hours — skipping: ${n.headline}`);
          continue;
        }
        console.log(`Pushing: ${n.headline}`);
        const { sent, dead } = await pushToAll(n, subs, webPush);
        totalPushed += sent;
        console.log(`Sent: ${sent}, Dead: ${dead.length}`);

        // Clean up dead subscriptions
        if (dead.length > 0) {
          const cleaned = subs.filter(s => !dead.includes(s.endpoint));
          await db.set(KV_SUBS, cleaned);
        }
      }
    } else if (toAlert.length > 0) {
      console.log("Push skipped — webpush or VAPID keys not available");
    }

    // Update seen IDs
    const allIds = [...seen, ...newOnes.map(n => n.id)].slice(-300);
    await db.set(KV_SEEN, allIds);

    console.log(`Done: ${narratives.length} narratives, ${toAlert.length} alerts, ${totalPushed} pushed`);
    return res.status(200).json({
      ok: true,
      narratives: narratives.length,
      new: newOnes.length,
      alerts: toAlert.length,
      pushed: totalPushed,
      quiet,
    });

  } catch(e) {
    console.error("narratives-cron failed:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
