// api/auto-brief.js
// Vercel cron job — runs weekdays at 12:30 UTC (7:30 EST / 8:30 EDT)
// Generates macro briefs for ES, Gold, Oil and Euro
// then emails all 4 formatted tweets to Elvis ready to copy-paste.
//
// Required environment variables (set in Vercel dashboard):
//   ANTHROPIC_API_KEY   — your existing Claude API key
//   LOOPS_API_KEY       — your existing Loops API key

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

const DELIVERY_EMAIL = "elviskotungondo@gmail.com";

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

// ── FORMAT BRIEF INTO TWEET TEXT ──────────────────────────────────────────────
function formatTweet(brief, hashtags) {
  const biasEmoji = { BULLISH: "🟢", BEARISH: "🔴", NEUTRAL: "🟡" };
  const emoji = biasEmoji[brief.bias] || "🟡";
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
    timeZone: "America/New_York",
  });

  const truncate = (str, max) =>
    str && str.length > max ? str.slice(0, max - 1) + "…" : str;

  const tweet = `${brief.instrument} — ${date}

🏦 ${truncate(brief.central_bank, 50)}
⚠️ ${truncate(brief.key_risk, 50)}
📅 ${truncate(brief.next_event, 50)}
${emoji} ${brief.bias} — ${truncate(brief.bias_reason, 40)}

marketdebriefs.com
${hashtags} #MacroTrading`;

  return tweet.length > 275 ? tweet.slice(0, 272) + "…" : tweet;
}

// ── BUILD EMAIL HTML ──────────────────────────────────────────────────────────
function buildEmailHtml(tweets) {
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "America/New_York",
  });

  const tweetBlocks = tweets.map(({ label, tweet, status }) => {
    if (status === "failed") {
      return `
        <div style="margin-bottom:28px;">
          <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:1.5px;margin-bottom:8px;">
            ${label.toUpperCase()}
          </div>
          <div style="background:#1a0a0a;border:1px solid #ff475744;border-radius:8px;padding:14px;color:#ff4757;font-size:13px;">
            Brief generation failed for this instrument. Run manually if needed.
          </div>
        </div>`;
    }

    const escaped = tweet
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `
      <div style="margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#00d4ff;letter-spacing:1.5px;margin-bottom:8px;">
          ${label.toUpperCase()}
        </div>
        <div style="background:#0d1117;border:1px solid rgba(0,212,255,.2);border-radius:8px;padding:16px;">
          <pre style="margin:0;font-family:monospace;font-size:13px;color:#e0e0e0;white-space:pre-wrap;line-height:1.7;">${escaped}</pre>
        </div>
        <div style="margin-top:6px;font-size:11px;color:#444;font-family:monospace;">
          ${tweet.length} / 280 characters
        </div>
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0c0f;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.06);">
      <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;margin-bottom:4px;">
        MARKET<span style="color:#00d4ff;">DEBRIEFS</span>
      </div>
      <div style="font-size:12px;color:#444;font-family:monospace;letter-spacing:1px;">
        DAILY CONTENT — ${date.toUpperCase()}
      </div>
    </div>
    <div style="background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.1);border-radius:8px;padding:14px 16px;margin-bottom:28px;">
      <div style="font-size:13px;color:#888;line-height:1.6;">
        Your 4 macro posts for today are ready below.
        Copy each one and post to <strong style="color:#e0e0e0;">@MarketDebriefs</strong> on X.
        Takes 5 minutes. ☕
      </div>
    </div>
    ${tweetBlocks}
    <div style="padding-top:20px;border-top:1px solid rgba(255,255,255,.06);font-size:11px;color:#2a2a2a;font-family:monospace;">
      Generated automatically by MarketDebriefs · marketdebriefs.com
    </div>
  </div>
</body>
</html>`;
}

// ── SEND EMAIL VIA LOOPS EVENT ───────────────────────────────────────────────
async function sendEmail(htmlContent, date) {
  const res = await fetch("https://app.loops.so/api/v1/events/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.LOOPS_API_KEY}`,
    },
    body: JSON.stringify({
      email: DELIVERY_EMAIL,
      eventName: "daily_macro_posts",
      eventProperties: {
        htmlContent,
        date,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Loops email error ${res.status}: ${err}`);
  }

  return res.json();
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  const isCron = req.headers["x-vercel-cron"] === "1";
  const isManualTest = req.method === "POST" &&
    req.headers["x-manual-trigger"] === process.env.ANTHROPIC_API_KEY;

  if (!isCron && !isManualTest) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  // Skip weekends
  const day = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });
  if (day === "Saturday" || day === "Sunday") {
    console.log("Weekend — skipping auto-brief");
    return res.status(200).json({ ok: true, skipped: "weekend" });
  }

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
    timeZone: "America/New_York",
  });

  console.log(`Auto-brief starting — ${new Date().toISOString()}`);

  const tweets = [];

  for (const { label, hashtags } of DAILY_INSTRUMENTS) {
    try {
      console.log(`Generating brief for ${label}...`);
      const brief = await generateTweetBrief(label);
      const tweet = formatTweet(brief, hashtags);
      console.log(`Brief ready for ${label} — ${tweet.length} chars`);
      tweets.push({ label, tweet, status: "ok" });
    } catch (err) {
      console.error(`Failed for ${label}:`, err.message);
      tweets.push({ label, tweet: "", status: "failed" });
    }
  }

  try {
    console.log("Building and sending email...");
    const html = buildEmailHtml(tweets);
    await sendEmail(html, date);
    console.log(`Email sent to ${DELIVERY_EMAIL}`);
  } catch (err) {
    console.error("Email send failed:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }

  const results = tweets.map(({ label, status, tweet }) => ({
    instrument: label,
    status,
    chars: tweet.length,
  }));

  console.log("Auto-brief complete:", results);
  return res.status(200).json({ ok: true, results, emailSent: true });
}
