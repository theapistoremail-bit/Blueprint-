// /api/run-node.js — Vercel serverless function (CommonJS)
// Usa los nombres de variable EXACTAMENTE como están en Vercel.
const ENV = {
  claude:   'CLAUDEAPIKEY',
  openai:   'OPENAPIKEY',
  deepseek: 'DEEPSEAK',
  leonardo: 'LEONARDO',
  meshy:    'MESHI',
};

const key = (p) => {
  const name = ENV[p];
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable ${name} en Vercel (¿hiciste Redeploy?)`);
  return v;
};

const j = async (r) => {
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = { raw: t }; }
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  return d;
};

const withPersona = (persona, input) => ({
  system: persona || 'Eres un asistente útil.',
  user: input,
});

const handlers = {
  async claude({ persona, input }) {
    const { system, user } = withPersona(persona, input);
    const d = await j(await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key('claude'),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1500, system,
        messages: [{ role: 'user', content: user }],
      }),
    }));
    return { text: d.content.filter(b => b.type === 'text').map(b => b.text).join('\n') };
  },

  async openai({ persona, input }) {
    const { system, user } = withPersona(persona, input);
    const d = await j(await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key('openai')}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    }));
    return { text: d.choices[0].message.content };
  },

  async deepseek({ persona, input }) {
    const { system, user } = withPersona(persona, input);
    const d = await j(await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key('deepseek')}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    }));
    return { text: d.choices[0].message.content };
  },

  // Leonardo: 'start' devuelve id, 'status' consulta el resultado
  async leonardo({ mode, input, id }) {
    const h = { Authorization: `Bearer ${key('leonardo')}`, 'content-type': 'application/json' };
    if (mode === 'status') {
      const d = await j(await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${id}`, { headers: h }));
      const g = d.generations_by_pk;
      return { status: g.status, images: (g.generated_images || []).map(i => i.url) };
    }
    const d = await j(await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
      method: 'POST', headers: h,
      body: JSON.stringify({ prompt: input, num_images: 1, width: 1024, height: 1024 }),
    }));
    return { id: d.sdGenerationJob.generationId };
  },

  // Meshy: 'start' devuelve id, 'status' consulta el resultado
  async meshy({ mode, input, id }) {
    const h = { Authorization: `Bearer ${key('meshy')}`, 'content-type': 'application/json' };
    if (mode === 'status') {
      const d = await j(await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${id}`, { headers: h }));
      return { status: d.status, progress: d.progress, model_urls: d.model_urls };
    }
    const d = await j(await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
      method: 'POST', headers: h,
      body: JSON.stringify({ mode: 'preview', prompt: input }),
    }));
    return { id: d.result };
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });
  try {
    const { provider, ...rest } = req.body || {};
    const fn = handlers[provider];
    if (!fn) return res.status(400).json({ error: `Proveedor desconocido: ${provider}` });
    res.status(200).json(await fn(rest));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
