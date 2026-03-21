// api/chart-data.js
// Serverless proxy — fetches Yahoo Finance OHLC data server-side
// bypassing browser CORS restrictions.
// Called by the Post-Session card in App.jsx
//
// Usage: GET /api/chart-data?ticker=ES%3DF&days=30

export const config = { maxDuration: 10 };

const TICKER_MAP = {
  // Futures
  "ES S&P 500":       "ES=F",
  "NQ NASDAQ 100":    "NQ=F",
  "Gold XAU/USD":     "GC=F",
  "Gold":             "GC=F",
  "WTI Crude Oil":    "CL=F",
  "Brent Crude":      "BZ=F",
  "Silver XAG/USD":   "SI=F",
  "Natural Gas":      "NG=F",
  "RTY Russell 2000": "RTY=F",
  "YM Dow Jones":     "YM=F",
  "10Y Treasury Note":"ZN=F",
  // FX
  "EUR/USD":          "EURUSD=X",
  "GBP/USD":          "GBPUSD=X",
  "USD/JPY":          "USDJPY=X",
  "AUD/USD":          "AUDUSD=X",
  "USD/CAD":          "USDCAD=X",
  "USD/CHF":          "USDCHF=X",
  "US Dollar DXY":    "DX-Y.NYB",
  // Crypto
  "Bitcoin":          "BTC-USD",
  "Ethereum":         "ETH-USD",
  // Indices
  "VIX Fear Index":   "^VIX",
  "DAX 40":           "^GDAXI",
  "FTSE 100":         "^FTSE",
  "CAC 40":           "^FCHI",
  "Nikkei 225":       "^N225",
};

export default async function handler(req, res) {
  // CORS headers — allow requests from your own domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { instrument, days = 30 } = req.query;

  if (!instrument) {
    return res.status(400).json({ error: "instrument param required" });
  }

  const ticker = TICKER_MAP[instrument];
  if (!ticker) {
    return res.status(404).json({ error: "Instrument not mapped", instrument });
  }

  const end   = Math.floor(Date.now() / 1000);
  const start = end - (parseInt(days) * 24 * 60 * 60);
  const url   = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${start}&period2=${end}&interval=1d&events=history`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketDebriefs/1.0)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Yahoo returned ${response.status}` });
    }

    const json   = await response.json();
    const result = json.chart?.result?.[0];

    if (!result || !result.timestamp) {
      return res.status(404).json({ error: "No data returned", ticker });
    }

    const ts   = result.timestamp;
    const ohlc = result.indicators.quote[0];
    const meta = result.meta;

    const candles = ts.map((t, i) => ({
      t,
      o: ohlc.open[i]  ? parseFloat(ohlc.open[i].toFixed(4))  : null,
      h: ohlc.high[i]  ? parseFloat(ohlc.high[i].toFixed(4))  : null,
      l: ohlc.low[i]   ? parseFloat(ohlc.low[i].toFixed(4))   : null,
      c: ohlc.close[i] ? parseFloat(ohlc.close[i].toFixed(4)) : null,
    })).filter(c => c.o && c.h && c.l && c.c);

    return res.status(200).json({
      ticker,
      instrument,
      currency:  meta.currency || "USD",
      lastClose: meta.regularMarketPrice || candles[candles.length - 1]?.c,
      candles,
    });

  } catch (err) {
    console.error("chart-data error:", err.message);
    return res.status(500).json({ error: "Fetch failed", detail: err.message });
  }
}
