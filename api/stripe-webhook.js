// api/stripe-webhook.js
// Handles Stripe subscription lifecycle webhooks.
// Key events:
//   checkout.session.completed         -> trial started, activate Pro immediately
//   customer.subscription.updated      -> trial converted to paid, stays Pro
//   customer.subscription.deleted      -> cancelled, remove Pro
//   customer.subscription.trial_will_end -> 3 days before trial ends (for future email)
//
// Set STRIPE_WEBHOOK_SECRET in Vercel env vars from Stripe Dashboard -> Webhooks

import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk  = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig     = req.headers["stripe-signature"];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // req.body must be raw buffer for signature verification
    const rawBody = typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    console.error("Webhook signature failed:", e.message);
    return res.status(400).json({ error: `Webhook error: ${e.message}` });
  }

  const getClerkUserId = (obj) =>
    obj?.metadata?.clerk_user_id || null;

  try {
    switch (event.type) {

      // ── Trial started: user completed checkout, card on file, trial active ──
      case "checkout.session.completed": {
        const session  = event.data.object;
        if (session.mode !== "subscription") break;
        const userId   = getClerkUserId(session);
        if (!userId) { console.warn("No clerk_user_id in checkout session metadata"); break; }

        // Activate Pro immediately (they have full access during trial)
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            pro: true,
            pro_since: new Date().toISOString(),
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            on_trial: true,
          },
        });
        console.log(`Trial started - Pro activated for ${userId}`);
        break;
      }

      // ── Subscription updated: trial -> paid, or plan change ──────────────
      case "customer.subscription.updated": {
        const sub    = event.data.object;
        const userId = getClerkUserId(sub);
        if (!userId) break;

        const wasTrialing = event.data.previous_attributes?.status === "trialing";
        const isActive    = sub.status === "active";
        const isCancelled = sub.cancel_at_period_end === true;

        if (wasTrialing && isActive) {
          // Trial just converted to paid subscription
          await clerk.users.updateUserMetadata(userId, {
            publicMetadata: {
              pro: true,
              on_trial: false,
              trial_converted: new Date().toISOString(),
            },
          });
          console.log(`Trial converted to paid for ${userId}`);
        } else if (isCancelled) {
          // User cancelled - stays Pro until period ends, handled by deleted event
          console.log(`Subscription cancelled (will end at period end) for ${userId}`);
        }
        break;
      }

      // ── Subscription deleted: trial expired without paying, or cancelled ──
      case "customer.subscription.deleted": {
        const sub    = event.data.object;
        const userId = getClerkUserId(sub);
        if (!userId) break;

        // Remove Pro access - downgrade to free
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            pro: false,
            on_trial: false,
            pro_ended: new Date().toISOString(),
          },
        });
        console.log(`Pro removed for ${userId} (subscription deleted)`);
        break;
      }

      // ── Trial ending in 3 days: placeholder for future reminder email ─────
      case "customer.subscription.trial_will_end": {
        const sub    = event.data.object;
        const userId = getClerkUserId(sub);
        console.log(`Trial ending soon for ${userId} - reminder email can be sent here`);
        // TODO: trigger Loops transactional email
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (e) {
    console.error(`Error handling ${event.type}:`, e.message);
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ received: true });
}
