// api/earnings-watch.js
// Returns large cap earnings for today, yesterday, and tomorrow.
// Used by EarningsWatch component in the Stocks tab.
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const FH_KEY = process.env.FINNHUB_API_KEY;
  if (!FH_KEY) return res.status(200).json({ reportingToday: [], prevMovers: [] });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yday = new Date(today); yday.setDate(yday.getDate() - 1);
  const ydayStr = yday.toISOString().slice(0, 10);

  const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
  const tmrwStr = tmrw.toISOString().slice(0, 10);

  try {
    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${ydayStr}&to=${tmrwStr}&token=${FH_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub ${r.status}`);
    const raw = await r.json();
    const all = (raw.earningsCalendar || []).filter(e => LARGE_CAPS.includes(e.symbol));

    const reportingToday = all
      .filter(e => e.date === todayStr)
      .map(e => ({
        ticker: e.symbol,
        name: NAME_MAP[e.symbol] || e.symbol,
        hour: e.hour === "bmo" ? "pre" : e.hour === "amc" ? "post" : "tbd",
      }));

    const prevMovers = all
      .filter(e => e.date === ydayStr && e.epsActual != null)
      .map(e => {
        const surprise = e.epsEstimate
          ? (((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100).toFixed(1)
          : null;
        return {
          ticker: e.symbol,
          name: NAME_MAP[e.symbol] || e.symbol,
          epsActual: e.epsActual,
          epsEstimate: e.epsEstimate,
          surprise,
          beat: e.epsEstimate != null ? e.epsActual >= e.epsEstimate : null,
        };
      });

    return res.status(200).json({ reportingToday, prevMovers });
  } catch (e) {
    console.error("earnings-watch error:", e.message);
    return res.status(200).json({ reportingToday: [], prevMovers: [], error: e.message });
  }
}
