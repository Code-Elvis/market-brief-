// api/loops-webhook.js
// Receives Clerk user.created webhooks and enrolls new users
// into the Trading Files email sequence in Loops.
//
// Required environment variables (set in Vercel dashboard):
//   CLERK_WEBHOOK_SECRET   — from Clerk Dashboard → Webhooks → your endpoint → Signing Secret
//   LOOPS_API_KEY          — from Loops → Settings → API Key

import { Webhook } from "svix";

export const config = {
  api: {
    // Must be raw body for signature verification — do NOT let Next/Vercel parse it
    bodyParser: false,
  },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Read the raw request body as a Buffer */
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Add or update a contact in Loops */
async function upsertLoopsContact({ email, firstName, lastName }) {
  const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
    },
    body: JSON.stringify({
      email,
      firstName: firstName || "",
      lastName: lastName || "",
      source: "clerk-signup",
      userGroup: "free",
      // Custom properties visible in Loops contact profile
      signupDate: new Date().toISOString(),
      plan: "free",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Loops contact create failed: ${res.status} — ${body}`);
  }

  return res.json();
}

/** Fire the trigger event that starts the Trading Files loop in Loops */
async function triggerTradingFiles(email) {
  const res = await fetch("https://app.loops.so/api/v1/events/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
    },
    body: JSON.stringify({
      email,
      // Must match the event name you set on the loop trigger in Loops
      eventName: "trading_files_signup",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Loops event trigger failed: ${res.status} — ${body}`);
  }

  return res.json();
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── 1. VERIFY CLERK WEBHOOK SIGNATURE ──────────────────────────────────────
  // Clerk signs every webhook with svix. Without this check, anyone could
  // hit your endpoint and fake a signup. Never skip this in production.

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  // Read raw body — required for signature verification
  const rawBody = await getRawBody(req);

  // Extract svix headers Clerk sends with every webhook
  const svixId        = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignature = req.headers["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: "Missing svix headers" });
  }

  // Verify signature — throws if invalid or replayed
  let event;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  // ── 2. FILTER FOR USER CREATION EVENTS ONLY ────────────────────────────────
  // Clerk can send many event types — we only care about new signups
  if (event.type !== "user.created") {
    // Acknowledge other events so Clerk doesn't retry them
    return res.status(200).json({ ok: true, skipped: event.type });
  }

  // ── 3. EXTRACT USER DATA ───────────────────────────────────────────────────
  const { data } = event;

  const email = data.email_addresses?.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;

  if (!email) {
    console.error("No primary email found in user.created event", data.id);
    return res.status(400).json({ error: "No email address found" });
  }

  const firstName = data.first_name || "";
  const lastName  = data.last_name  || "";

  console.log(`New signup: ${email} (Clerk ID: ${data.id})`);

  // ── 4. ADD TO LOOPS + TRIGGER SEQUENCE ────────────────────────────────────
  try {
    // Create the contact first so it exists before the event fires
    await upsertLoopsContact({ email, firstName, lastName });
    console.log(`Loops contact created: ${email}`);

    // Trigger the Trading Files onboarding sequence
    await triggerTradingFiles(email);
    console.log(`Trading Files sequence triggered: ${email}`);

    return res.status(200).json({ ok: true, email });

  } catch (err) {
    // Log the error but return 200 so Clerk doesn't retry endlessly.
    // Failed enrollments should be monitored in your Vercel function logs.
    console.error("Loops enrollment failed:", err.message);
    return res.status(200).json({ ok: true, warning: err.message });
  }
}
