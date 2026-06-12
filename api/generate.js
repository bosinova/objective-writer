/**
 * Vercel serverless function: POST /api/generate -> Anthropic Messages API.
 * Hardened: key read from ANTHROPIC_API_KEY (no VITE_ prefix, never bundled),
 * model and max_tokens pinned server-side, origin locked to this app.
 */

const ALLOWED_ORIGINS = [
  "https://objectivewriter.com",
  "https://www.objectivewriter.com",
  "https://objective-writer.vercel.app",
];

// Client sends an optional "task" field. It never sends a model.
// Any model/max_tokens in the client body is ignored.
const TASKS = {
  light: { model: "claude-haiku-4-5-20251001", maxTokens: 1024 },
  generate: { model: "claude-sonnet-4-6", maxTokens: 2048 },
};

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Anthropic API key is not configured on the server.",
    });
  }

  try {
    const body = req.body || {};
    const config = TASKS[body.task] || TASKS.generate;

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: "Missing messages" });
    }

    // Convert a string system prompt to a cache-control block so
    // Anthropic caches it across requests.
    let system = body.system;
    if (typeof system === "string") {
      system = [
        {
          type: "text",
          text: system,
          cache_control: { type: "ephemeral" },
        },
      ];
    }

    const payload = {
      model: config.model,
      max_tokens: config.maxTokens,
      messages: body.messages,
      ...(system ? { system } : {}),
      ...(typeof body.temperature === "number"
        ? { temperature: body.temperature }
        : {}),
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify(payload),
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