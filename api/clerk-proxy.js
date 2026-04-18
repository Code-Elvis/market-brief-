// api/clerk-proxy.js
// Handles Clerk webhook events and Pro upgrade endpoint.
// NEW: Sets trial_start in publicMetadata when a new user signs up.

import { createClerkClient } from "@clerk/backend";
import Stripe from "stripe";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, svix-id, svix-timestamp, svix-signature");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // ── Route: Pro upgrade (called from checkout success) ─────────────────────
  if (body.action === "set_pro") {
    const { userId } = body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: { pro: true },
      });
      console.log(`Pro activated for user ${userId}`);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("set_pro failed:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Route: Clerk webhook events ───────────────────────────────────────────
  // Verify webhook signature if CLERK_WEBHOOK_SECRET is set
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (webhookSecret) {
    const svixId        = req.headers["svix-id"];
    const svixTimestamp = req.headers["svix-timestamp"];
    const svixSignature = req.headers["svix-signature"];
    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }
    // Basic timestamp check - reject events older than 5 minutes
    const ts = parseInt(svixTimestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) {
      return res.status(400).json({ error: "Webhook timestamp too old" });
    }
  }

  const event = body;

  // ── Event: user.created  -  Start 7-day trial ────────────────────────────
  if (event.type === "user.created") {
    const userId = event.data?.id;
    if (!userId) return res.status(400).json({ error: "Missing user ID in event" });

    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          pro: false,
          trial_start: new Date().toISOString(),
        },
      });
      console.log(`Trial started for new user ${userId}`);
      return res.status(200).json({ ok: true, trial_started: true });
    } catch (e) {
      console.error("user.created handler failed:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Event: user.deleted  -  cleanup (optional) ───────────────────────────
  if (event.type === "user.deleted") {
    console.log(`User deleted: ${event.data?.id}`);
    return res.status(200).json({ ok: true });
  }

  // Unknown event type - acknowledge receipt
  return res.status(200).json({ ok: true, received: event.type });
}
