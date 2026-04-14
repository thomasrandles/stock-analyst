const https = require("https");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method Not Allowed" } });

  try {
    const body = req.body;

    // Use server-side env var first, fall back to key provided by browser
    const apiKey = process.env.ANTHROPIC_API_KEY || body.apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: { message: "No API key found. Please enter your API key using the 🔑 button." } });
    }

    const { apiKey: _, ...anthropicBody } = body;
    const payload = JSON.stringify(anthropicBody);

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        timeout: 115000,
      };

      const req = https.request(options, (response) => {
        let data = "";
        response.on("data", (chunk) => { data += chunk; });
        response.on("end", () => resolve({ status: response.statusCode, body: data }));
      });

      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
      req.write(payload);
      req.end();
    });

    res.status(result.status).json(JSON.parse(result.body));

  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
};
