import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3001;

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

app.post("/api/generate", async (req, res) => {
  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Anthropic API key is not configured on the server." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Objective Writer server] Anthropic error:", response.status, data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("[Objective Writer server] Proxy error:", error);
    res.status(500).json({ error: "Failed to reach Anthropic API." });
  }
});

app.listen(port, () => {
  console.log(`[Objective Writer server] Proxy listening on http://localhost:${port}`);
});

