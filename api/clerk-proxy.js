// api/clerk-proxy.js
// Handles Clerk webhook events.
// Uses fetch to Clerk REST API - no @clerk/backend package needed.

async function updateClerkUser(userId, publicMetadata) {
  const r = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: publicMetadata }),
  });
  if (!r.ok) throw new Error(`Clerk API error ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, svix-id, svix-timestamp, svix-signature");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }

  // Manual Pro override (support use)
  if (body.action === "set_pro") {
    const { userId } = body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
      await updateClerkUser(userId, { pro: true, on_trial: false });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const event = body;

  if (event.type === "user.created") {
    const userId = event.data?.id;
    if (!userId) return res.status(400).json({ error: "Missing user ID" });
    try {
      await updateClerkUser(userId, {
        pro: false,
        on_trial: false,
        signup_at: new Date().toISOString(),
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
