// api/earnings-watch.js
// Returns large cap earnings for today, yesterday, and tomorrow.
// Uses US Eastern time for date calculations to match market conventions.
// Env vars: FINNHUB_API_KEY

export const config = { maxDuration: 10 };

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

// ET offset: UTC-4 during EDT (Mar-Nov), UTC-5 during EST (Nov-Mar)
// Using UTC-4 as default — close enough for calendar date boundaries
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
  const fromStr  = getETDateStr(-3); // 3 days back to catch AMC stragglers

  try {
    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${fromStr}&to=${tmrwStr}&token=${FH_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub ${r.status}`);
    const raw = await r.json();
    const all = (raw.earningsCalendar || []).filter(e => LARGE_CAPS.includes(e.symbol));

    // Reporting today
    const reportingToday = all
      .filter(e => e.date === todayStr)
      .map(e => ({
        ticker: e.symbol,
        name: NAME_MAP[e.symbol] || e.symbol,
        hour: e.hour === "bmo" ? "pre" : e.hour === "amc" ? "post" : "tbd",
      }));

    // Previous movers: last 3 days, most recent per ticker, include pending results
    const prevDates = [getETDateStr(-1), getETDateStr(-2), getETDateStr(-3)];
    const seen = new Set();
    const prevMovers = all
      .filter(e => prevDates.includes(e.date) && !seen.has(e.symbol) && seen.add(e.symbol))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map(e => {
        const hasResult = e.epsActual != null;
        const surprise = hasResult && e.epsEstimate
          ? (((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100).toFixed(1)
          : null;
        return {
          ticker: e.symbol,
          name: NAME_MAP[e.symbol] || e.symbol,
          date: e.date,
          hour: e.hour === "bmo" ? "pre" : e.hour === "amc" ? "post" : "tbd",
          epsActual: e.epsActual ?? null,
          epsEstimate: e.epsEstimate ?? null,
          surprise,
          beat: hasResult && e.epsEstimate != null ? e.epsActual >= e.epsEstimate : null,
          pending: !hasResult,
        };
      });

    return res.status(200).json({ reportingToday, prevMovers, v: 2 });
  } catch (e) {
    console.error("earnings-watch error:", e.message);
    return res.status(200).json({ reportingToday: [], prevMovers: [], error: e.message });
  }
}
