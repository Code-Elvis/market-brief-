// api/checkout.js
// Creates a Stripe Checkout Session for Pro subscription with 7-day trial.
// Uses fetch directly - no stripe package needed.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
  catch (e) { return res.status(400).json({ error: "Invalid JSON" }); }

  const { userId, email } = body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY;
  const PRICE_ID     = process.env.STRIPE_PRICE_ID;
  const APP_URL      = process.env.NEXT_PUBLIC_APP_URL || "https://marketdebriefs.com";

  const params = new URLSearchParams({
    mode: "subscription",
    "payment_method_types[0]": "card",
    "line_items[0][price]": PRICE_ID,
    "line_items[0][quantity]": "1",
    "subscription_data[trial_period_days]": "7",
    "subscription_data[metadata][clerk_user_id]": userId,
    "metadata[clerk_user_id]": userId,
    "success_url": `${APP_URL}/app?upgraded=true`,
    "cancel_url": `${APP_URL}/app`,
    "allow_promotion_codes": "true",
    "custom_text[submit][message]": "Your card will not be charged for 7 days. Cancel anytime.",
  });

  if (email) params.set("customer_email", email);

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || "Stripe error");
    return res.status(200).json({ url: data.url });
  } catch (e) {
    console.error("Stripe checkout error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
