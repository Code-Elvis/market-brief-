// api/auto-brief.js
// Vercel cron job — runs weekdays at 12:30 UTC (7:30 EST / 8:30 EDT)
// Generates macro briefs for ES, Gold, Oil and Euro
// then posts each as a tweet to X automatically.
//
// Required environment variables (set in Vercel dashboard):
//   ANTHROPIC_API_KEY        — your existing Claude API key
//   X_API_KEY                — Consumer Key from X developer portal
//   X_API_SECRET             — Consumer Secret from X developer portal
//   X_ACCESS_TOKEN           — Access Token from X developer portal
//   X_ACCESS_TOKEN_SECRET    — Access Token Secret from X developer portal

import crypto from "crypto";

export const config = {
  maxDuration: 60,
};

// ── INSTRUMENTS TO BRIEF DAILY ────────────────────────────────────────────────
const DAILY_INSTRUMENTS = [
  { key: "es",   label: "ES S&P 500",    hashtags: "#ES #SPX" },
  { key: "gold", label: "Gold XAU/USD",  hashtags: "#Gold #XAUUSD" },
  { key: "oil",  label: "WTI Crude Oil", hashtags: "#Oil #CrudeOil" },
  { key: "euro", label: "EUR/USD",       hashtags: "#EURUSD #Forex" },
];

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
function tweetSysPrompt() {
  return `You are a macro market analyst writing ultra-concise daily briefings for traders on X.
Respond ONLY with valid JSON. No markdown, no backticks, no preamble. Start with { and end with }.
CRITICAL: Every field must be 50 characters or less — this formats into a tweet with a hard 280 char limit.
RULES:
1. Never mention specific price levels, targets, or stops.
2. Focus only on CURRENT macro — central bank stance, live risk, next event.
3. bias_reason must be 40 chars or less.
SCHEMA: {"instrument":"string","bias":"BULLISH|BEARISH|NEUTRAL","bias_reason":"string","central_bank":"string","key_risk":"string","next_event":"string"}`;
}

function tweetUserPrompt(label) {
  const now = new Date().toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "America/New_York",
  });
  return `Time: ${now} EST. Ultra-concise tweet-ready macro brief for ${label}. Each field max 50 chars. No price levels. Current central bank stance, biggest risk right now, next high-impact event.`;
}

// ── GENERATE BRIEF VIA CLAUDE ─────────────────────────────────────────────────
async function generateTweetBrief(label) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: tweetSysPrompt(),
      messages: [{ role: "user", content: tweetUserPrompt(label) }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Claude response");
  return JSON.parse(match[0]);
}

// ── FORMAT BRIEF INTO TWEET ───────────────────────────────────────────────────
// Designed to stay comfortably under 250 chars leaving buffer room
function formatTweet(brief, hashtags) {
  const biasEmoji = { BULLISH: "🟢", BEARISH: "🔴", NEUTRAL: "🟡" };
  const emoji = biasEmoji[brief.bias] || "🟡";
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
    timeZone: "America/New_York",
  });

  // Truncate any field that somehow exceeds limit — safety net
  const truncate = (str, max) =>
    str && str.length > max ? str.slice(0, max - 1) + "…" : str;

  const tweet = `${brief.instrument} — ${date}

🏦 ${truncate(brief.central_bank, 50)}
⚠️ ${truncate(brief.key_risk, 50)}
📅 ${truncate(brief.next_event, 50)}
${emoji} ${brief.bias} — ${truncate(brief.bias_reason, 40)}

marketdebriefs.com
${hashtags} #MacroTrading`;

  // Final safety check — hard truncate at 275 to stay under 280
  return tweet.length > 275 ? tweet.slice(0, 272) + "…" : tweet;
}

// ── OAUTH 1.0a SIGNING ────────────────────────────────────────────────────────
// X API v2 posting requires OAuth 1.0a user context — no external libs needed
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function buildOAuthHeader(method, url, credentials) {
  const oauthParams = {
    oauth_consumer_key:     credentials.apiKey,
    oauth_nonce:            crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            credentials.accessToken,
    oauth_version:          "1.0",
  };

  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join("&");

  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`;

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams.oauth_signature = signature;

  return (
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
      .join(", ")
  );
}

// ── POST TWEET TO X ───────────────────────────────────────────────────────────
async function postTweet(tweetText) {
  const url = "https://api.twitter.com/2/tweets";

  const credentials = {
    apiKey:            process.env.X_API_KEY,
    apiSecret:         process.env.X_API_SECRET,
    accessToken:       process.env.X_ACCESS_TOKEN,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
  };

  const oauthHeader = buildOAuthHeader("POST", url, credentials);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": oauthHeader,
    },
    body: JSON.stringify({ text: tweetText }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API error ${res.status}: ${err}`);
  }

  return res.json();
}


// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  // Only allow Vercel cron calls (GET with correct header) or manual test (POST)
  const isCron = req.headers["x-vercel-cron"] === "1";
  const isManualTest = req.method === "POST" &&
    req.headers["x-manual-trigger"] === process.env.ANTHROPIC_API_KEY;

  if (!isCron && !isManualTest) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  // Skip weekends — cron runs Mon-Fri only but double check here
  const day = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });
  if (day === "Saturday" || day === "Sunday") {
    console.log("Weekend — skipping auto-brief");
    return res.status(200).json({ ok: true, skipped: "weekend" });
  }

  console.log(`Auto-brief starting — ${new Date().toISOString()}`);

  const results = [];

  for (let i = 0; i < DAILY_INSTRUMENTS.length; i++) {
    const { label, hashtags } = DAILY_INSTRUMENTS[i];

    try {
      // 1. Generate brief
      console.log(`Generating brief for ${label}...`);
      const brief = await generateTweetBrief(label);

      // 2. Format into tweet
      const tweetText = formatTweet(brief, hashtags);
      console.log(`Tweet for ${label} (${tweetText.length} chars):\n${tweetText}\n`);

      // 3. Post to X
      const posted = await postTweet(tweetText);
      console.log(`Posted ${label} — tweet ID: ${posted.data?.id}`);

      results.push({ instrument: label, status: "posted", tweetId: posted.data?.id });

    } catch (err) {
      console.error(`Failed for ${label}:`, err.message);
      results.push({ instrument: label, status: "failed", error: err.message });
    }


  }

  console.log("Auto-brief complete:", results);
  return res.status(200).json({ ok: true, results });
}
