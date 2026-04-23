// api/candle.js
// Proxy for Finnhub stock candle data — keeps API key server-side.
// Used by the Aged Well feature to fetch intraday price data.
// Env vars: FINNHUB_API_KEY

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol, resolution, from, to } = req.query;
  if (!symbol || !resolution || !from || !to) {
    return res.status(400).json({ error: "Missing params: symbol, resolution, from, to" });
  }

  const FH_KEY = process.env.FINNHUB_API_KEY;
  if (!FH_KEY) return res.status(200).json({ s: "no_data", error: "FINNHUB_API_KEY not set" });

  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${FH_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub ${r.status}`);
    const data = await r.json();
    return res.status(200).json(data);
  } catch(e) {
    console.error("candle error:", e.message);
    return res.status(200).json({ s: "error", error: e.message });
  }
}
