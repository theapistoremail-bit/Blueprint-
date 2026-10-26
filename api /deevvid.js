// /api/deevid.js
// Proxy hacia la API de Anthropic. La API key nunca llega al navegador:
// vive únicamente en la variable de entorno CLAUDEAPIKEY de Vercel.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.deevid;
  if (!apiKey) {
    res.status(500).json({ error: "Falta configurar CLAUDEAPIKEY en Vercel" });
    return;
  }

  const { system, prompt, useSearch } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Falta el prompt" });
    return;
  }

  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: system || undefined,
    messages: [{ role: "user", content: prompt }],
  };
  if (useSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  try {
    const upstream = await fetch(" ", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Error de Claude API" });
      return;
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Error de red hacia Claude" });
  }
}
