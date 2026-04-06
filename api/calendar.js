// api/calendar.js
// Fetches today’s high-impact economic events from Finnhub
// Caches server-side for 60 minutes
// Used by Scalper Mode to inject real calendar data into the AI prompt
//
// Env vars: FINNHUB_API_KEY (already set)

export const config = { maxDuration: 15 };

let cache = { events: [], fetched_at: null, ttl_ms: 60 * 60 * 1000 };

function isCacheValid() {
return cache.fetched_at &&
cache.events.length > 0 &&
Date.now() - cache.fetched_at < cache.ttl_ms;
}

// Convert UTC ISO string to EST time string e.g. “10:00 AM”
function toEST(isoString) {
if (!isoString) return “”;
try {
const d = new Date(isoString);
return d.toLocaleTimeString(“en-US”, {
timeZone: “America/New_York”,
hour: “2-digit”,
minute: “2-digit”,
hour12: true,
});
} catch { return “”; }
}

// Get how far away an event is from now
function getDueIn(isoString) {
if (!isoString) return “”;
try {
const diff = new Date(isoString) - Date.now();
const mins = Math.round(diff / 60000);
if (mins < -60) return `${Math.abs(Math.round(mins/60))}h ago`;
if (mins < 0) return `${Math.abs(mins)}m ago`;
if (mins < 60) return `${mins}m`;
const h = Math.floor(mins / 60);
const m = mins % 60;
return m > 0 ? `${h}h ${m}m` : `${h}h`;
} catch { return “”; }
}

export default async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Cache-Control”, “s-maxage=3600, stale-while-revalidate”);

const force = req.query?.force === “true”;

if (!force && isCacheValid()) {
// Recalculate due_in and passed from live time even when serving cache
const now = Date.now();
const refreshed = cache.events.map(ev => ({
…ev,
due_in: getDueIn(ev.raw_time),
passed: ev.raw_time ? new Date(ev.raw_time) < now : false,
}));
return res.status(200).json({ events: refreshed, cached: true });
}

const FH_KEY = process.env.FINNHUB_API_KEY;
if (!FH_KEY) {
return res.status(200).json({ events: [], error: “FINNHUB_API_KEY not set” });
}

try {
// Get today’s date range in EST
const now = new Date();
const estDate = now.toLocaleDateString(“en-CA”, { timeZone: “America/New_York” });
// Also get tomorrow for events that cross midnight
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const tomorrowDate = tomorrow.toLocaleDateString(“en-CA”, { timeZone: “America/New_York” });

```
const url = `https://finnhub.io/api/v1/calendar/economic?from=${estDate}&to=${estDate}&token=${FH_KEY}`;
const r = await fetch(url);
if (!r.ok) throw new Error(`Finnhub ${r.status}`);
const data = await r.json();

const raw = data.economicCalendar || [];

// Filter to high-impact only and map to our format
const HIGH_IMPACT_KEYWORDS = [
  "fed", "fomc", "powell", "gdp", "nfp", "payroll", "unemployment",
  "cpi", "inflation", "pce", "pmi", "ism", "jolts", "retail sales",
  "consumer confidence", "durable goods", "trade balance", "housing",
  "jobless claims", "initial claims", "interest rate", "rate decision",
  "oil", "crude", "inventory", "central bank", "treasury", "speech",
  "press conference", "employment", "manufacturing",
];

const events = raw
  .filter(ev => {
    const name = (ev.event || "").toLowerCase();
    // Include if impact is HIGH or name contains key macro terms
    return ev.impact === "high" ||
      HIGH_IMPACT_KEYWORDS.some(kw => name.includes(kw));
  })
  .map(ev => ({
    event: ev.event || "",
    time_est: toEST(ev.time),
    raw_time: ev.time,
    due_in: getDueIn(ev.time),
    passed: ev.time ? new Date(ev.time) < Date.now() : false,
    impact: ev.impact || "medium",
    country: ev.country || "",
    unit: ev.unit || "",
    estimate: ev.estimate != null ? String(ev.estimate) : "",
    prev: ev.prev != null ? String(ev.prev) : "",
  }))
  .sort((a, b) => new Date(a.raw_time) - new Date(b.raw_time));

console.log(`Finnhub calendar: ${raw.length} total, ${events.length} high-impact`);

cache = { events, fetched_at: Date.now(), ttl_ms: cache.ttl_ms };

return res.status(200).json({
  events,
  date: estDate,
  count: events.length,
  cached: false,
});
```

} catch(err) {
console.error(“calendar error:”, err.message);
if (cache.events.length > 0) {
return res.status(200).json({ events: cache.events, cached: true, error: err.message });
}
return res.status(200).json({ events: [], error: err.message });
}
}