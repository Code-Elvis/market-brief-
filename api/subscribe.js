// api/subscribe.js
// Adds a subscriber to Loops and triggers the welcome sequence.
// Env vars: LOOPS_API_KEY (already set in Vercel)

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });

  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address." });
  }

  const LOOPS_KEY = process.env.LOOPS_API_KEY;
  if (!LOOPS_KEY) {
    return res.status(500).json({ success: false, message: "Subscription service not configured." });
  }

  try {
    // Create or update contact in Loops
    const contactRes = await fetch("https://app.loops.so/api/v1/contacts/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOOPS_KEY}`,
      },
      body: JSON.stringify({
        email,
        source: "landing_page_capture",
        subscribed: true,
        userGroup: "email_subscribers",
      }),
    });

    const contactData = await contactRes.json();

    // If contact already exists, update instead
    if (!contactRes.ok && contactData.message?.includes("already exists")) {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed — briefs are on their way.",
      });
    }

    if (!contactRes.ok) {
      console.error("Loops contact error:", contactData);
      return res.status(500).json({ success: false, message: "Could not subscribe. Please try again." });
    }

    // Trigger the daily brief email sequence (use your existing sequence ID or create a new one)
    // This is optional — if you have a welcome sequence set up in Loops, trigger it here
    // await fetch("https://app.loops.so/api/v1/events/send", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOOPS_KEY}` },
    //   body: JSON.stringify({ email, eventName: "email_subscriber_welcome" }),
    // });

    return res.status(200).json({
      success: true,
      message: "Subscribed successfully.",
    });

  } catch(err) {
    console.error("subscribe error:", err.message);
    return res.status(500).json({ success: false, message: "Network error. Please try again." });
  }
