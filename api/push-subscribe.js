// api/push-subscribe.js
// POST: store a push subscription { subscription, userId, watchList }
// DELETE: remove subscription by endpoint
// Stores in Vercel KV. Falls back gracefully if KV unavailable.

export const config = { maxDuration: 10 };

const KV_KEY = "md:push:subs";

async function kv() {
  try {
    const m = await import("@vercel/kv");
    return m.kv;
  } catch(e) { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const db = await kv();
  if (!db) return res.status(200).json({ ok: false, note: "KV unavailable" });

  if (req.method === "POST") {
    const { subscription, userId, watchList = [] } = req.body || {};
    if (!subscription?.endpoint) return res.status(400).json({ ok: false });

    const subs = (await db.get(KV_KEY)) || [];
    // Remove old entry for same endpoint then prepend fresh one
    const updated = subs.filter(s => s.endpoint !== subscription.endpoint);
    updated.unshift({ endpoint: subscription.endpoint, keys: subscription.keys, userId, watchList, ts: Date.now() });
    await db.set(KV_KEY, updated.slice(0, 500)); // cap at 500 subs
    return res.status(200).json({ ok: true, count: updated.length });
  }

  if (req.method === "DELETE") {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ ok: false });
    const subs    = (await db.get(KV_KEY)) || [];
    const updated = subs.filter(s => s.endpoint !== endpoint);
    await db.set(KV_KEY, updated);
    return res.status(200).json({ ok: true, count: updated.length });
  }

  return res.status(405).json({ ok: false });
}
