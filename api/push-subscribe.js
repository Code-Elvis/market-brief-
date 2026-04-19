// api/push-subscribe.js
// Saves or removes Web Push subscriptions.
// KV is only used if configured - gracefully degrades otherwise.
// @vercel/kv is NOT imported at module level to avoid crashing the bundle.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // KV not available yet - return success silently
  // Will be enabled once @vercel/kv is in package.json
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(200).json({ ok: true, note: "KV not configured - subscription not saved" });
  }

  let kv;
  try {
    const kvMod = await import("@vercel/kv");
    kv = kvMod.kv;
  } catch (e) {
    return res.status(200).json({ ok: true, note: "KV not available" });
  }

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }

  const KV_SUBSCRIPTIONS = "md:push:subscriptions";

  try {
    if (req.method === "DELETE") {
      const { endpoint } = body;
      if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
      const existing = await kv.get(KV_SUBSCRIPTIONS) || [];
      const updated = existing.filter(s => s.endpoint !== endpoint);
      await kv.set(KV_SUBSCRIPTIONS, updated);
      return res.status(200).json({ ok: true, removed: true });
    }

    if (req.method === "POST") {
      const { subscription } = body;
      if (!subscription?.endpoint) return res.status(400).json({ error: "Missing subscription" });
      const existing = await kv.get(KV_SUBSCRIPTIONS) || [];
      const filtered = existing.filter(s => s.endpoint !== subscription.endpoint);
      filtered.push(subscription);
      await kv.set(KV_SUBSCRIPTIONS, filtered);
      return res.status(200).json({ ok: true, subscribed: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("push-subscribe error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
