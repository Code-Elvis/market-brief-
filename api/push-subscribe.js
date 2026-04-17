// api/push-subscribe.js
// Saves or removes Web Push subscriptions in Vercel KV.
// Called from App.jsx when a Pro user enables or disables alerts.

import { kv } from "@vercel/kv";

const KV_SUBSCRIPTIONS = "md:push:subscriptions";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { subscription } = body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Missing subscription" });
  }

  let subscriptions = [];
  try {
    subscriptions = (await kv.get(KV_SUBSCRIPTIONS)) || [];
  } catch (e) {
    subscriptions = [];
  }

  if (req.method === "POST") {
    // Add subscription if not already stored
    const exists = subscriptions.some(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
      await kv.set(KV_SUBSCRIPTIONS, subscriptions);
      console.log(`New push subscription. Total: ${subscriptions.length}`);
    }
    return res.status(200).json({ ok: true, count: subscriptions.length });
  }

  if (req.method === "DELETE") {
    const before = subscriptions.length;
    subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
    await kv.set(KV_SUBSCRIPTIONS, subscriptions);
    console.log(`Removed push subscription. ${before} -> ${subscriptions.length}`);
    return res.status(200).json({ ok: true, count: subscriptions.length });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
