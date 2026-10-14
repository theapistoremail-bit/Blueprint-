// /api/claude.js
// Proxy hacia la API de Anthropic. La API key nunca llega al navegador:
// vive únicamente en la variable de entorno CLAUDEAPIKEY de Vercel.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.CLAUDEAPIKEY;
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
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
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
// /api/claude.js
// Proxy hacia la API de Anthropic. La API key nunca llega al navegador:
// vive únicamente en la variable de entorno CLAUDEAPIKEY de Vercel.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.CLAUDEAPIKEY;
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
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
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
// /api/leonardo.js
// Proxy hacia Leonardo.Ai. La key vive en la variable de entorno LEONARDO de Vercel.
// Crea la generación y hace polling hasta que las imágenes estén listas.
const DEFAULT_MODEL_ID = "7b592283-e8a7-4c5a-9ba6-d18c31f258b9"; // Lucid Origin

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.LEONARDO;
  if (!apiKey) {
    res.status(500).json({ error: "Falta configurar LEONARDO en Vercel" });
    return;
  }

  const { prompt, modelId, width, height } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Falta el prompt" });
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };

  try {
    const create = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        modelId: modelId || DEFAULT_MODEL_ID,
        width: width || 1024,
        height: height || 1024,
        num_images: 1,
      }),
    });
    const createData = await create.json();
    if (!create.ok) {
      res.status(create.status).json({ error: createData?.error || "Error creando la generación en Leonardo" });
      return;
    }

    const genId = createData?.sdGenerationJob?.generationId;
    if (!genId) {
      res.status(500).json({ error: "Leonardo no devolvió un generationId" });
      return;
    }

    let images = [];
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const poll = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${genId}`, { headers });
      const pollData = await poll.json();
      const gen = pollData?.generations_by_pk;
      if (gen?.status === "COMPLETE") {
        images = (gen.generated_images || []).map((g) => g.url);
        break;
      }
      if (gen?.status === "FAILED") {
        res.status(500).json({ error: "La generación falló en Leonardo" });
        return;
      }
    }

    if (images.length === 0) {
      res.status(504).json({ error: "Leonardo tardó demasiado en responder" });
      return;
    }

    res.status(200).json({ url: images[0], images });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Error de red hacia Leonardo" });
  }
}
// /api/meshy.js
// Proxy hacia Meshy (texto → modelo 3D). La key vive en la variable de entorno MESHI de Vercel.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const apiKey = process.env.MESHI;
  if (!apiKey) {
    res.status(500).json({ error: "Falta configurar MESHI en Vercel" });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Falta el prompt" });
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };

  try {
    const create = await fetch("https://api.meshy.ai/openapi/v2/text-to-3d", {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "preview", prompt, art_style: "realistic" }),
    });
    const createData = await create.json();
    if (!create.ok) {
      res.status(create.status).json({ error: createData?.message || "Error creando la tarea en Meshy" });
      return;
    }

    const taskId = createData.result;
    let task = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`, { headers });
      task = await poll.json();
      if (task.status === "SUCCEEDED" || task.status === "FAILED") break;
    }

    if (!task || task.status !== "SUCCEEDED") {
      res.status(500).json({ error: "Meshy no terminó la generación a tiempo" });
      return;
    }

    res.status(200).json({ thumbnail: task.thumbnail_url, modelUrl: task.model_urls?.glb });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Error de red hacia Meshy" });
  }
}

