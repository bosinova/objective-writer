/**
 * Vercel serverless function: proxy POST /api/generate to Anthropic Messages API.
 * Reads API key from process.env.VITE_ANTHROPIC_API_KEY.
 */
export default async function handler(req, res) {
  // CORS: allow same-origin and common origins
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Anthropic API key is not configured on the server.",
    });
  }
  try {
    const body = req.body || {};

    // If the request includes a system prompt string, convert it to a
    // cache-control array so Anthropic can cache it across requests.
    if (typeof body.system === "string") {
      body.system = [
        {
          type: "text",
          text: body.system,
          cache_control: { type: "ephemeral" },
        },
      ];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("[api/generate] Anthropic error:", response.status, data);
      return res.status(response.status).json(data);
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error("[api/generate] Proxy error:", error);
    return res.status(500).json({ error: "Failed to reach Anthropic API." });
  }
}