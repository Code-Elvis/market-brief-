// api/stripe-webhook.js
// Handles Stripe subscription lifecycle webhooks.
// Uses only node built-ins + fetch - no stripe or @clerk/backend package needed.
// Verifies Stripe signature manually using crypto (built into Node).

import crypto from "crypto";

// ── Verify Stripe webhook signature ─────────────────────────────────────────
function verifyStripeSignature(rawBody, signature, secret) {
  const parts = signature.split(",").reduce((acc, part) => {
    const [key, val] = part.split("=");
    acc[key] = val;
    return acc;
  }, {});
  const timestamp = parts.t;
  const sigHash   = parts.v1;
  if (!timestamp || !sigHash) return false;
  // Reject events older than 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;
  const payload  = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHash));
}

// ── Update Clerk user metadata via REST API ──────────────────────────────────
async function updateClerkUser(userId, publicMetadata) {
  const url = `https://api.clerk.com/v1/users/${userId}/metadata`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: publicMetadata }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clerk API error ${res.status}: ${text}`);
  }
  return res.json();
}

const getClerkUserId = (obj) => obj?.metadata?.clerk_user_id || null;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig    = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  // Parse raw body
  const rawBody = typeof req.body === "string"
    ? req.body
    : JSON.stringify(req.body);

  // Verify signature
  if (!verifyStripeSignature(rawBody, sig || "", secret)) {
    console.error("Invalid Stripe signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  let event;
  try {
    event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.log(`Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const userId = getClerkUserId(session);
        if (!userId) { console.warn("No clerk_user_id in checkout metadata"); break; }
        await updateClerkUser(userId, {
          pro: true,
          on_trial: true,
          pro_since: new Date().toISOString(),
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        });
        console.log(`Trial started - Pro activated for ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub    = event.data.object;
        const userId = getClerkUserId(sub);
        if (!userId) break;
        const wasTrialing = event.data.previous_attributes?.status === "trialing";
        const isActive    = sub.status === "active";
        if (wasTrialing && isActive) {
          await updateClerkUser(userId, {
            pro: true,
            on_trial: false,
            trial_converted: new Date().toISOString(),
          });
          console.log(`Trial converted to paid for ${userId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub    = event.data.object;
        const userId = getClerkUserId(sub);
        if (!userId) break;
        await updateClerkUser(userId, {
          pro: false,
          on_trial: false,
          pro_ended: new Date().toISOString(),
        });
        console.log(`Pro removed for ${userId}`);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub    = event.data.object;
        const userId = getClerkUserId(sub);
        console.log(`Trial ending soon for ${userId}`);
        // TODO: trigger Loops reminder email
        break;
      }

      default:
        console.log(`Unhandled: ${event.type}`);
    }
  } catch (e) {
    console.error(`Error handling ${event.type}:`, e.message);
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ received: true });
}
