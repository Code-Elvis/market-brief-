// api/earnings-watch.js
// Returns large cap earnings for today, upcoming, and recent movers.
// Uses Finnhub /stock/earnings (per-ticker) for actual results — more reliable than calendar.
// Env vars: FINNHUB_API_KEY

export const config = { maxDuration: 25 };

const LARGE_CAPS = [
  "AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","AVGO",
  "JPM","V","XOM","UNH","WMT","NFLX","AMD","BA","GS","BAC","COST","ORCL",
];

const NAME_MAP = {
  AAPL:"Apple", MSFT:"Microsoft", NVDA:"Nvidia", AMZN:"Amazon",
  GOOGL:"Alphabet", META:"Meta", TSLA:"Tesla", AVGO:"Broadcom",
  JPM:"JPMorgan", V:"Visa", XOM:"Exxon", UNH:"UnitedHealth",
  WMT:"Walmart", NFLX:"Netflix", AMD:"AMD", BA:"Boeing",
  GS:"Goldman Sachs", BAC:"Bank of America", COST:"Costco", ORCL:"Oracle",
};

// ET offset: UTC-4 during EDT
function getETDateStr(offsetDays = 0) {
  const now = new Date();
  const etMs = now.getTime() + (offsetDays * 86400000) - (4 * 3600000);
  return new Date(etMs).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method === "OPTIONS") return res.status(200).end();

  const FH_KEY = process.env.FINNHUB_API_KEY;
  if (!FH_KEY) return res.status(200).json({ reportingToday: [], prevMovers: [] });

  const todayStr = getETDateStr(0);
  const tmrwStr  = getETDateStr(1);
  const fromStr  = getETDateStr(-7); // 7-day lookback covers full earnings week

  try {
    // ── 1. Calendar: get today + upcoming + recent schedule ──────────────────
    const calUrl = `https://finnhub.io/api/v1/calendar/earnings?from=${fromStr}&to=${tmrwStr}&token=${FH_KEY}`;
    const calRes = await fetch(calUrl);
    if (!calRes.ok) throw new Error(`Finnhub calendar ${calRes.status}`);
    const calRaw = await calRes.json();
    const calAll = (calRaw.earningsCalendar || []).filter(e => LARGE_CAPS.includes(e.symbol));

    // Reporting today
    const reportingToday = calAll
      .filter(e => e.date === todayStr)
      .map(e => ({
        ticker: e.symbol,
        name: NAME_MAP[e.symbol] || e.symbol,
        hour: e.hour === "bmo" ? "pre" : e.hour === "amc" ? "post" : "tbd",
      }));

    // Tickers that reported in last 7 days per calendar (may lack epsActual)
    const recentCalTickers = [...new Set(
      calAll
        .filter(e => e.date >= fromStr && e.date < todayStr)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(e => e.symbol)
    )].slice(0, 8);

    // ── 2. Per-ticker earnings: reliable actual results ───────────────────────
    // Fetch last reported quarter for each recent ticker in parallel
    const tickerResults = await Promise.all(
      recentCalTickers.map(async ticker => {
        try {
          const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&limit=1&token=${FH_KEY}`;
          const r = await fetch(url);
          if (!r.ok) return null;
          const data = await r.json();
          const latest = Array.isArray(data) ? data[0] : null;
          if (!latest) return null;

          // Check if this was reported within last 7 days
          const reportDate = latest.period || latest.date || "";
          const calEntry = calAll.find(e => e.symbol === ticker && e.date >= fromStr);
          const reportedDate = calEntry?.date || reportDate;

          if (!reportedDate || reportedDate < fromStr) return null;

          const actual   = latest.epsActual ?? latest.actual ?? null;
          const estimate = latest.epsEstimate ?? latest.estimate ?? null;
          const hasResult = actual != null;
          const surprise = hasResult && estimate
            ? (((actual - estimate) / Math.abs(estimate)) * 100).toFixed(1)
            : null;

          return {
            ticker,
            name: NAME_MAP[ticker] || ticker,
            date: reportedDate,
            hour: calEntry?.hour === "bmo" ? "pre" : calEntry?.hour === "amc" ? "post" : "amc",
            epsActual: actual,
            epsEstimate: estimate,
            surprise,
            beat: hasResult && estimate != null ? actual >= estimate : null,
            pending: !hasResult,
          };
        } catch(e) { return null; }
      })
    );

    const prevMovers = tickerResults
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date));

    return res.status(200).json({ reportingToday, prevMovers, v: 3 });
  } catch (e) {
    console.error("earnings-watch error:", e.message);
    return res.status(200).json({ reportingToday: [], prevMovers: [], error: e.message });
  }
}
