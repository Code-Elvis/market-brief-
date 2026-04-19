// api/loops-webhook.js
// Receives Clerk user.created webhooks and enrolls new users
// into the Trading Files email sequence in Loops.
// Uses crypto (Node built-in) instead of svix package.

import crypto from "crypto";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // Basic timestamp check
  const svixTimestamp = req.headers["svix-timestamp"];
  if (svixTimestamp) {
    const ts = parseInt(svixTimestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) {
      return res.status(400).json({ error: "Webhook timestamp too old" });
    }
  }

  let event;
  try {
    event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // Only handle user.created
  if (event.type !== "user.created") {
    return res.status(200).json({ ok: true, received: event.type });
  }

  const user = event.data;
  const email = user?.email_addresses?.[0]?.email_address;
  const firstName = user?.first_name || "";
  const lastName = user?.last_name || "";

  if (!email) return res.status(200).json({ ok: true, note: "No email" });

  const LOOPS_KEY = process.env.LOOPS_API_KEY;
  if (!LOOPS_KEY) return res.status(200).json({ ok: true, note: "LOOPS_API_KEY not set" });

  try {
    // Add contact to Loops
    await fetch("https://app.loops.so/api/v1/contacts/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOOPS_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, firstName, lastName, source: "clerk_signup" }),
    });

    return res.status(200).json({ ok: true, enrolled: email });
  } catch (e) {
    console.error("Loops webhook error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
