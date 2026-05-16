// api/brief.js
// Proxies requests to Anthropic API.
// Supports streaming via ?stream=true — sends SSE chunks so the UI
// can render the brief progressively as tokens arrive.
// Env: ANTHROPIC_API_KEY

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const AN_KEY = process.env.ANTHROPIC_API_KEY;
  if (!AN_KEY) return res.status(500).json({ error: { message: "No API key" } });

  const body   = req.body || {};
  const stream = req.query?.stream === "true" || body.stream === true;

  // Build the Anthropic request body
  const payload = {
    model:      body.model      || "claude-sonnet-4-20250514",
    max_tokens: body.max_tokens || 1000,
    system:     body.system     || "",
    messages:   body.messages   || [],
    stream,
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         AN_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!stream) {
    // Non-streaming — pass through as-is
    const data = await response.json();
    return res.status(response.status).json(data);
  }

  // Streaming — pipe SSE from Anthropic to client
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }
  } catch(e) {
    console.error("stream error:", e.message);
  } finally {
    res.end();
  }
}
