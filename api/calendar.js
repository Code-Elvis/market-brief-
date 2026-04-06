// api/calendar.js
// Fetches today's high-impact economic events from multiple sources
// Falls back gracefully if primary source fails
// Caches server-side for 30 minutes
//
// Uses Finnhub economic calendar (paid) OR falls back to 
// forexfactory-style public calendar data

export const config = { maxDuration: 20 };

let cache = { events: [], fetched_at: null, ttl_ms: 30 * 60 * 1000 };

function isCacheValid() {
  return cache.fetched_at &&
    cache.events.length > 0 &&
    Date.now() - cache.fetched_at < cache.ttl_ms;
}

function toEST(isoString) {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return ""; }
}

function getDueIn(isoString) {
  if (!isoString) return "";
  try {
    const diff = new Date(isoString) - Date.now();
    const mins = Math.round(diff / 60000);
    if (mins < -90) return `${Math.abs(Math.round(mins/60))}h ago`;
    if (mins < 0) return `${Math.abs(mins)}m ago`;
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  } catch { return ""; }
}

// ── SOURCE 1: Finnhub economic calendar ──────────────────────────────────────
async function fetchFinnhub(date, key) {
  const url = `https://finnhub.io/api/v1/calendar/economic?from=${date}&to=${date}&token=${key}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Finnhub ${r.status}`);
  const data = await r.json();
  const events = data.economicCalendar || [];
  if (events.length === 0) throw new Error("Finnhub returned empty calendar");
  return events.map(ev => ({
    event: ev.event || "",
    time_est: toEST(ev.time),
    raw_time: ev.time,
    due_in: getDueIn(ev.time),
    passed: ev.time ? new Date(ev.time) < Date.now() : false,
    impact: ev.impact || "medium",
    country: ev.country || "US",
    estimate: ev.estimate != null ? String(ev.estimate) : "",
    prev: ev.prev != null ? String(ev.prev) : "",
  }));
}

// ── SOURCE 2: TradingEconomics public calendar scrape ─────────────────────────
async function fetchTradingEconomics(date) {
  // TE has a public calendar endpoint that returns JSON without auth for basic access
  const url = `https://tradingeconomics.com/calendar`;
  const r = await fetch(url, {
    headers: {
      "Accept": "application/json, text/javascript, */*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (compatible; MarketDebriefs/1.0)",
    },
  });
  if (!r.ok) throw new Error(`TE ${r.status}`);
  // TE returns HTML for the page — not JSON — so this source needs the API
  throw new Error("TE requires API subscription for JSON");
}

// ── SOURCE 3: ForexFactory calendar via their JSON feed ───────────────────────
async function fetchForexFactory(dateStr) {
  // ForexFactory has a public JSON calendar endpoint
  // Format: https://nfs.faireconomy.media/ff_calendar_thisweek.json
  const r = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketDebriefs/1.0)" },
  });
  if (!r.ok) throw new Error(`ForexFactory ${r.status}`);
  const data = await r.json();

  // Filter to today only and high impact
  const todayEST = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit", day: "2-digit", year: "numeric",
  });

  return data
    .filter(ev => {
      if (ev.impact !== "High") return false;
      // Check if this event is today in EST
      const evDate = new Date(ev.date).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "2-digit", day: "2-digit", year: "numeric",
      });
      return evDate === todayEST;
    })
    .map(ev => {
      const rawTime = ev.date; // ISO string
      return {
        event: ev.title || "",
        time_est: toEST(rawTime),
        raw_time: rawTime,
        due_in: getDueIn(rawTime),
        passed: rawTime ? new Date(rawTime) < Date.now() : false,
        impact: "high",
        country: ev.country || "",
        estimate: ev.forecast || "",
        prev: ev.previous || "",
      };
    })
    .sort((a, b) => new Date(a.raw_time) - new Date(b.raw_time));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate");

  const force = req.query?.force === "true";

  if (!force && isCacheValid()) {
    const now = Date.now();
    return res.status(200).json({
      events: cache.events.map(ev => ({
        ...ev,
        due_in: getDueIn(ev.raw_time),
        passed: ev.raw_time ? new Date(ev.raw_time) < now : false,
      })),
      source: cache.source,
      cached: true,
    });
  }

  const FH_KEY = process.env.FINNHUB_API_KEY;
  const estDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  let events = [];
  let source = "";

  // Try Finnhub first
  if (FH_KEY) {
    try {
      events = await fetchFinnhub(estDate, FH_KEY);
      source = "finnhub";
      console.log(`Finnhub calendar: ${events.length} events`);
    } catch(e) {
      console.warn("Finnhub calendar failed:", e.message);
    }
  }

  // Fall back to ForexFactory if Finnhub empty
  if (events.length === 0) {
    try {
      events = await fetchForexFactory(estDate);
      source = "forexfactory";
      console.log(`ForexFactory calendar: ${events.length} events`);
    } catch(e) {
      console.warn("ForexFactory calendar failed:", e.message);
    }
  }

  if (events.length === 0) {
    return res.status(200).json({
      events: [],
      source: "none",
      error: "All calendar sources returned no data",
      date: estDate,
    });
  }

  cache = { events, fetched_at: Date.now(), ttl_ms: cache.ttl_ms, source };

  return res.status(200).json({
    events,
    source,
    date: estDate,
    count: events.length,
    cached: false,
  });
}
