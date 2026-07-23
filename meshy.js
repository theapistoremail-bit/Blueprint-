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
