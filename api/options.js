// api/options.js
// Options flow data endpoint - fetches from Unusual Whales or similar
// Currently returns placeholder data until API key is configured

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const UW_KEY = process.env.UNUSUAL_WHALES_KEY;
  if (!UW_KEY) {
    return res.status(200).json({
      ticker: ticker.toUpperCase(),
      note: "Options flow API not configured",
      flow: []
    });
  }

  try {
    const url = `https://api.unusualwhales.com/api/stock/${encodeURIComponent(ticker.toUpperCase())}/option-contracts?limit=20`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${UW_KEY}`, "Content-Type": "application/json" }
    });
    if (!r.ok) throw new Error(`UW API ${r.status}`);
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error("options.js error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
