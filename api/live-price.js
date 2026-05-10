// api/live-price.js
// Fetches last session close % change for any instrument from Yahoo Finance.
// Free, no API key. Used to ground post-session briefs in real price data.
// Query: ?symbol=GBPUSD=X  or  ?symbol=GC=F  or  ?symbol=%5EGSPC

export const config = { maxDuration: 10 };

// Map MarketDebriefs instrument labels to Yahoo Finance symbols
const SYMBOL_MAP = {
  "GBP/USD":           "GBPUSD=X",
  "EUR/USD":           "EURUSD=X",
  "USD/JPY":           "JPY=X",
  "AUD/USD":           "AUDUSD=X",
  "USD/CAD":           "CAD=X",
  "USD/CHF":           "CHF=X",
  "NZD/USD":           "NZDUSD=X",
  "US Dollar DXY":     "DX-Y.NYB",
  "Gold XAU/USD":      "GC=F",
  "Silver XAG/USD":    "SI=F",
  "Copper HG":         "HG=F",
  "WTI Crude Oil":     "CL=F",
  "Brent Crude":       "BZ=F",
  "Natural Gas":       "NG=F",
  "ES S&P 500":        "ES=F",
  "NQ NASDAQ 100":     "NQ=F",
  "RTY Russell 2000":  "RTY=F",
  "YM Dow Jones":      "YM=F",
  "DAX 40":            "^GDAXI",
  "Nikkei 225":        "^N225",
  "FTSE 100":          "^FTSE",
  "CAC 40":            "^FCHI",
  "Bitcoin":           "BTC-USD",
  "Ethereum":          "ETH-USD",
  "10Y Treasury Note": "^TNX",
  "VIX Fear Index":    "^VIX",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { instrument } = req.query;
  if (!instrument) return res.status(400).json({ error: "Missing instrument param" });

  const symbol = SYMBOL_MAP[instrument] || instrument;

  try {
    // Yahoo Finance v8 quote endpoint — free, no auth
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!r.ok) throw new Error(`Yahoo Finance ${r.status}`);
    const data = await r.json();

    const meta   = data?.chart?.result?.[0]?.meta;
    const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
    const timestamps = data?.chart?.result?.[0]?.timestamp;

    if (!meta || !quotes?.close) throw new Error("No data");

    // Get last two trading day closes (filter nulls)
    const closes = quotes.close.filter(c => c != null);
    if (closes.length < 2) throw new Error("Insufficient data");

    const lastClose = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const changePct = ((lastClose - prevClose) / prevClose) * 100;
    const direction = changePct >= 0 ? "up" : "down";

    // Get last session date
    const lastTs = timestamps?.[timestamps.length - 1];
    const sessionDate = lastTs
      ? new Date(lastTs * 1000).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })
      : "";

    return res.status(200).json({
      instrument,
      symbol,
      lastClose: parseFloat(lastClose.toFixed(5)),
      prevClose: parseFloat(prevClose.toFixed(5)),
      changePct: parseFloat(changePct.toFixed(3)),
      changePctStr: (changePct >= 0 ? "+" : "") + changePct.toFixed(2) + "%",
      direction,
      sessionDate,
    });
  } catch(e) {
    console.error("live-price error:", e.message);
    return res.status(200).json({ error: e.message });
  }
}
