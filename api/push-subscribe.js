// api/push-subscribe.js
// Stores push subscriptions in Vercel KV.
// POST: subscribe { subscription, userId, watchList, stockWatchList }
// DELETE: unsubscribe { endpoint }
// Subscriptions are stored with watchList so pre-event-brief.js can scope
// notifications to instruments the user actually trades.

export const config = { maxDuration: 10 };

const KV_SUBSCRIPTIONS = "md:push:subscriptions";

async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try { const { kv } = await import("@vercel/kv"); return kv; } catch(e) { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const kv = await getKV();
  if (!kv) return res.status(200).json({ ok: true, note: "KV not available" });

  if (req.method === "POST") {
    const { subscription, userId, watchList = [], stockWatchList = [] } = req.body || {};
    if (!subscription?.endpoint) return res.status(400).json({ ok: false, error: "Missing subscription" });

    const existing = await kv.get(KV_SUBSCRIPTIONS) || [];
    // Remove old entry for same endpoint, add fresh one with watchlist
    const updated = existing.filter(s => s.subscription?.endpoint !== subscription.endpoint);
    updated.push({
      subscription,
      userId: userId || null,
      watchList,       // e.g. ["gold", "es", "gbp"]
      stockWatchList,  // e.g. ["AAPL", "TSLA"]
      subscribedAt: Date.now(),
    });
    await kv.set(KV_SUBSCRIPTIONS, updated);
    return res.status(200).json({ ok: true, count: updated.length });
  }

  if (req.method === "DELETE") {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ ok: false, error: "Missing endpoint" });

    const existing = await kv.get(KV_SUBSCRIPTIONS) || [];
    const updated = existing.filter(s => s.subscription?.endpoint !== endpoint);
    await kv.set(KV_SUBSCRIPTIONS, updated);
    return res.status(200).json({ ok: true, count: updated.length });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
