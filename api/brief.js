export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.VITE_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Keep calling until we get a final text response
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    return res.status(200).json({ ...data, extractedText: text });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
