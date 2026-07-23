// /api/deepseek.js
// Proxy hacia DeepSeek. La key vive en la variable de entorno DEEPSEAK de Vercel.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.DEEPSEAK;
  if (!apiKey) {
    res.status(500).json({ error: "Falta configurar DEEPSEAK en Vercel" });
    return;
  }

  const { system, prompt } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Falta el prompt" });
    return;
  }

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  try {
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({ model: "deepseek-chat", messages }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Error de DeepSeek" });
      return;
    }

    res.status(200).json({ text: data.choices?.[0]?.message?.content || "" });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Error de red hacia DeepSeek" });
  }
}
