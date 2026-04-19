// api/clerk-proxy.js
// Handles Clerk webhook events.
// Pro activation is now handled by api/stripe-webhook.js via Stripe webhooks.
// Keeps set_pro as a manual support override.

import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, svix-id, svix-timestamp, svix-signature");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // Manual Pro override (support use)
  if (body.action === "set_pro") {
    const { userId } = body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: { pro: true, on_trial: false },
      });
      console.log(`Manual Pro activation for ${userId}`);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const event = body;

  // user.created: record signup timestamp for analytics
  if (event.type === "user.created") {
    const userId = event.data?.id;
    if (!userId) return res.status(400).json({ error: "Missing user ID" });
    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          pro: false,
          on_trial: false,
          signup_at: new Date().toISOString(),
        },
      });
      console.log(`New user registered: ${userId}`);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("user.created handler failed:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (event.type === "user.deleted") {
    console.log(`User deleted: ${event.data?.id}`);
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true, received: event.type });
}
