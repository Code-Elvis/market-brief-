// api/auto-brief.js
// Vercel cron — weekdays 12:30 UTC
// 1. Generates 4 tweet briefs → emails to Elvis
// 2. Generates subscriber daily macro brief → sends to email_subscribers list
//
// Env vars: ANTHROPIC_API_KEY, LOOPS_API_KEY, LOOPS_SUBSCRIBER_TRANSACTIONAL_ID

export const config = { maxDuration: 90 };

const DAILY_INSTRUMENTS = [
  { key: "es",   label: "ES S&P 500",    hashtags: "#ES #SPX" },
  { key: "gold", label: "Gold XAU/USD",  hashtags: "#Gold #XAUUSD" },
  { key: "oil",  label: "WTI Crude Oil", hashtags: "#Oil #CrudeOil" },
  { key: "euro", label: "EUR/USD",       hashtags: "#EURUSD #Forex" },
];

const DELIVERY_EMAIL = "elviskotungondo@gmail.com";

// ── CLAUDE CALL ───────────────────────────────────────────────────────────────
async function callClaude(system, user, maxTokens = 400) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  return JSON.parse(match[0]);
}

// ── TWEET BRIEF ───────────────────────────────────────────────────────────────
function tweetSysPrompt() {
  return `You are a macro market analyst writing ultra-concise daily briefings for traders on X.
Respond ONLY with valid JSON. No markdown, no backticks. Start with { and end with }.
CRITICAL: Every field must be 50 characters or less.
RULES: No price levels. Current macro only — central bank stance, live risk, next event.
SCHEMA: {"instrument":"string","bias":"BULLISH|BEARISH|NEUTRAL","bias_reason":"string","central_bank":"string","key_risk":"string","next_event":"string"}`;
}

function tweetUserPrompt(label) {
  const now = new Date().toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
  });
  return `Time: ${now} EST. Ultra-concise tweet-ready macro brief for ${label}. Each field max 50 chars. No price levels.`;
}

function formatTweet(brief, hashtags) {
  const emoji = { BULLISH: "\uD83D\uDFE2", BEARISH: "\uD83D\uDD34", NEUTRAL: "\uD83D\uDFE1" }[brief.bias] || "\uD83D\uDFE1";
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "America/New_York" });
  const t = (str, max) => str && str.length > max ? str.slice(0, max-1) + "\u2026" : (str || "");
  const tweet = `${brief.instrument} \u2014 ${date}\n\n\uD83C\uDFE6 ${t(brief.central_bank,50)}\n\u26A0\uFE0F ${t(brief.key_risk,50)}\n\uD83D\uDCC5 ${t(brief.next_event,50)}\n${emoji} ${brief.bias} \u2014 ${t(brief.bias_reason,40)}\n\nmarketdebriefs.com\n${hashtags} #MacroTrading`;
  return tweet.length > 275 ? tweet.slice(0, 272) + "\u2026" : tweet;
}

// ── SUBSCRIBER BRIEF ──────────────────────────────────────────────────────────
function subscriberSysPrompt() {
  return `You are a professional macro market analyst writing a daily morning brief for retail traders.
Respond ONLY with valid JSON. No markdown, no backticks. Start with { and end with }.
RULES:
1. Never mention specific price levels, targets or stops.
2. No directional signals — describe macro forces and context only.
3. Every section must be distinct — no repeating content.
4. today_theme: 8-12 word neutral phrase capturing the dominant macro story today.
5. Each body field: 2-3 sentences max. Punchy. Trader-relevant.
6. events: 3-5 high-impact events today with times in EST.
SCHEMA: {"today_theme":"string","fed_watch":"string","geopolitical":"string","commodities":"string","fx_rates":"string","events":[{"time":"string","event":"string","why_it_matters":"string"}],"watch_for":"string"}`;
}

function subscriberUserPrompt() {
  const now = new Date().toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/New_York",
  });
  return `Time: ${now} EST. Generate today\'s daily macro brief for retail traders. Cover: Fed/central bank stance, active geopolitical risks, commodity picture (oil/gold), FX context (dollar), today\'s high-impact events, and what to watch. No price levels. No directional signals. Context and interpretation only.`;
}

// ── SUBSCRIBER EMAIL HTML ─────────────────────────────────────────────────────
function buildSubscriberHtml(brief, date, dayName) {
  const rows = (brief.events || []).map(ev =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1a2626;color:#00d4ff;font-weight:700;font-size:12px;white-space:nowrap;vertical-align:top;">${ev.time}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1a2626;vertical-align:top;">
        <div style="color:#e0e0e0;font-size:13px;font-weight:600;margin-bottom:2px;">${ev.event}</div>
        <div style="color:#555;font-size:11px;">${ev.why_it_matters}</div>
      </td>
    </tr>`
  ).join("");

  const section = (icon, label, color, body) => body ? `
    <tr><td style="padding:0 0 14px;">
      <div style="background:rgba(0,0,0,.2);border-left:3px solid ${color};border-radius:0 8px 8px 0;padding:14px 16px;">
        <div style="font-size:9px;color:${color};letter-spacing:1.5px;font-weight:700;margin-bottom:8px;">${icon} ${label}</div>
        <div style="font-size:13px;color:#888;line-height:1.65;">${body}</div>
      </div>
    </td></tr>` : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060e0e;font-family:'Courier New',monospace;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060e0e;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" style="max-width:560px;">

  <tr><td style="padding:0 0 24px;">
    <div style="font-size:15px;font-weight:900;color:#fff;letter-spacing:1px;margin-bottom:4px;">MARKET<span style="color:#00d4ff;">DEBRIEFS</span></div>
    <div style="font-size:10px;color:#333;letter-spacing:2px;">${dayName.toUpperCase()} MACRO BRIEF &middot; ${date}</div>
    <div style="height:1px;background:linear-gradient(to right,rgba(0,212,255,.3),transparent);margin-top:14px;"></div>
  </td></tr>

  <tr><td style="padding:0 0 24px;">
    <div style="font-size:10px;color:#00d4ff;letter-spacing:2px;font-weight:700;margin-bottom:10px;opacity:.7;">TODAY\'S MACRO THEME</div>
    <div style="font-size:22px;font-weight:900;color:#fff;line-height:1.25;letter-spacing:-0.5px;">${brief.today_theme || ""}</div>
  </td></tr>

  ${section("&#x1F3E6;", "FED WATCH", "#00d4ff", brief.fed_watch)}
  ${section("&#x26A1;", "GEOPOLITICAL", "#ffa500", brief.geopolitical)}
  ${section("&#x1F6E2;", "COMMODITIES", "#ffd700", brief.commodities)}
  ${section("&#x1F4B1;", "FX &amp; RATES", "#c084fc", brief.fx_rates)}

  ${rows ? `<tr><td style="padding:0 0 20px;">
    <div style="font-size:9px;color:#333;letter-spacing:2px;font-weight:700;margin-bottom:10px;">&#x1F4C5; KEY EVENTS TODAY</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a2626;border-radius:8px;overflow:hidden;">${rows}</table>
  </td></tr>` : ""}

  ${brief.watch_for ? `<tr><td style="padding:0 0 24px;">
    <div style="background:rgba(0,212,170,.06);border:1px solid rgba(0,212,170,.15);border-radius:8px;padding:14px 16px;">
      <div style="font-size:9px;color:#00d4aa;letter-spacing:1.5px;font-weight:700;margin-bottom:8px;">&#x1F441; WATCH FOR TODAY</div>
      <div style="font-size:13px;color:#888;line-height:1.65;">${brief.watch_for}</div>
    </div>
  </td></tr>` : ""}

  <tr><td style="padding:20px 0 0;">
    <div style="height:1px;background:linear-gradient(to right,rgba(0,212,255,.2),transparent);margin-bottom:20px;"></div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-size:12px;color:#444;line-height:1.7;">Get your full instrument brief — Gold, ES, EUR/USD and 25+ markets.</div>
        <div style="font-size:11px;color:#333;margin-top:4px;">Brief First, Trade After.</div>
      </td>
      <td align="right" style="padding-left:12px;">
        <a href="https://marketdebriefs.com/app" style="display:inline-block;padding:10px 18px;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#000;font-weight:800;font-size:12px;border-radius:7px;text-decoration:none;white-space:nowrap;">Get Full Brief &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 0 0;text-align:center;">
    <div style="font-size:10px;color:#1a2626;">marketdebriefs.com &middot; Not financial advice</div>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

// ── SEND ELVIS TWEET EMAIL ────────────────────────────────────────────────────
async function sendTweetEmail(tweets, date) {
  const t = tweets;
  const res = await fetch("https://app.loops.so/api/v1/transactional", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.LOOPS_API_KEY}` },
    body: JSON.stringify({
      transactionalId: "cmmuwfd5900by0i1xz33mnca7",
      email: DELIVERY_EMAIL,
      dataVariables: {
        date,
        post1_label: t[0]?.label || "", post1_text: t[0]?.tweet || "Failed",
        post2_label: t[1]?.label || "", post2_text: t[1]?.tweet || "Failed",
        post3_label: t[2]?.label || "", post3_text: t[2]?.tweet || "Failed",
        post4_label: t[3]?.label || "", post4_text: t[3]?.tweet || "Failed",
      },
    }),
  });
  if (!res.ok) throw new Error(`Loops tweet email ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── SEND SUBSCRIBER BROADCAST ─────────────────────────────────────────────────
async function sendSubscriberBroadcast(brief, date, dayName) {
  const ID = process.env.LOOPS_SUBSCRIBER_TRANSACTIONAL_ID;
  if (!ID) {
    console.warn("LOOPS_SUBSCRIBER_TRANSACTIONAL_ID not set — skipping");
    return { skipped: true, reason: "No transactional ID configured" };
  }
  const events_text = (brief.events || []).map(e => `${e.time} — ${e.event}: ${e.why_it_matters}`).join("\n");
  const res = await fetch("https://app.loops.so/api/v1/transactional", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.LOOPS_API_KEY}` },
    body: JSON.stringify({
      transactionalId: ID,
      dataVariables: {
        date, day_name: dayName,
        today_theme:  brief.today_theme  || "",
        fed_watch:    brief.fed_watch    || "",
        geopolitical: brief.geopolitical || "",
        commodities:  brief.commodities  || "",
        fx_rates:     brief.fx_rates     || "",
        watch_for:    brief.watch_for    || "",
        events_text,
      },
    }),
  });
  if (!res.ok) throw new Error(`Loops subscriber ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const isCron   = req.headers["x-vercel-cron"] === "1";
  const isManual = req.method === "POST" && req.headers["x-manual-trigger"] === process.env.ANTHROPIC_API_KEY;
  if (!isCron && !isManual) return res.status(401).json({ error: "Unauthorised" });

  const day = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" });
  if (day === "Saturday" || day === "Sunday") return res.status(200).json({ ok: true, skipped: "weekend" });

  const date    = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "America/New_York" });
  const dayName = new Date().toLocaleDateString("en-GB", { weekday: "long", timeZone: "America/New_York" });

  console.log(`Auto-brief starting — ${new Date().toISOString()}`);

  // Step 1 — Tweet briefs
  const tweets = [];
  for (const { label, hashtags } of DAILY_INSTRUMENTS) {
    try {
      const brief = await callClaude(tweetSysPrompt(), tweetUserPrompt(label), 300);
      const tweet = formatTweet(brief, hashtags);
      tweets.push({ label, tweet, status: "ok" });
      console.log(`Tweet ready: ${label} — ${tweet.length} chars`);
    } catch(err) {
      console.error(`Tweet failed: ${label} — ${err.message}`);
      tweets.push({ label, tweet: "", status: "failed" });
    }
  }

  // Step 2 — Subscriber brief
  let subscriberBrief = null;
  try {
    subscriberBrief = await callClaude(subscriberSysPrompt(), subscriberUserPrompt(), 900);
    console.log("Subscriber brief ready:", subscriberBrief.today_theme);
  } catch(err) {
    console.error("Subscriber brief failed:", err.message);
  }

  // Step 3 — Send Elvis tweet email
  try {
    await sendTweetEmail(tweets, date);
    console.log("Tweet email sent");
  } catch(err) {
    console.error("Tweet email failed:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }

  // Step 4 — Send subscriber broadcast
  let subResult = null;
  if (subscriberBrief) {
    try {
      subResult = await sendSubscriberBroadcast(subscriberBrief, date, dayName);
      console.log("Subscriber broadcast sent");
    } catch(err) {
      console.error("Subscriber broadcast failed:", err.message);
      subResult = { error: err.message };
    }
  }

  return res.status(200).json({
    ok: true, date,
    tweets: tweets.map(({ label, status, tweet }) => ({ instrument: label, status, chars: tweet.length })),
    subscriber: subscriberBrief ? { theme: subscriberBrief.today_theme, events: subscriberBrief.events?.length, sent: subResult } : null,
  });
}
