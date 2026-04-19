// api/checkout.js
// Creates a Stripe Checkout Session for a Pro subscription with a 7-day free trial.
// Card is collected upfront but NOT charged during the trial.
// After 7 days Stripe automatically charges EUR 49/month.
// Stripe fires customer.subscription.trial_will_end (3 days before) and
// customer.subscription.updated (when trial converts to paid) webhooks.
// Those are handled in api/stripe-webhook.js

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { userId, email } = body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],

      // Pre-fill email if available
      ...(email ? { customer_email: email } : {}),

      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // Your EUR 49/mo recurring price ID
          quantity: 1,
        },
      ],

      // 7-day free trial - card collected now, charged after trial
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          clerk_user_id: userId,
        },
      },

      // Pass userId through so webhook can activate Pro after trial
      metadata: {
        clerk_user_id: userId,
      },

      // Redirect URLs
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://marketdebriefs.com"}/app?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://marketdebriefs.com"}/app`,

      // Allow promo codes
      allow_promotion_codes: true,

      // Custom text shown on checkout page
      custom_text: {
        submit: {
          message: "Your card will not be charged for 7 days. Cancel anytime before your trial ends.",
        },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
