// api/hermes.js — Vercel Serverless Function
// AXIOM Intelligence Engine — secure AI inference proxy
// Uses OpenRouter → nousresearch/hermes-3-llama-3.1-405b:free (truly free, no billing needed)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, max_tokens = 800 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured in Vercel env vars' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://axiom-intelligence.vercel.app',
        'X-Title': 'AXIOM Intelligence',
      },
      body: JSON.stringify({
        // DeepHermes-3 8B (fast, free) → fallback to Hermes-3 405B (free)
        // Both confirmed valid on openrouter.ai/nousresearch
        model: 'nousresearch/deephermes-3-llama-3-8b-preview:free',
        models: [
          'nousresearch/deephermes-3-llama-3-8b-preview:free',
          'nousresearch/hermes-3-llama-3.1-405b:free',
        ],
        route: 'fallback',
        messages: system
          ? [{ role: 'system', content: system }, ...messages]
          : messages,
        max_tokens,
        temperature: 0.75,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Inference error:', err);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text, model: data.model, usage: data.usage });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
