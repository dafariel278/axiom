// api/hermes.js — Vercel Serverless Function
// AXIOM Intelligence Engine — Nous Portal · Hermes 4

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

  const NOUS_API_KEY = process.env.NOUS_API_KEY;
  if (!NOUS_API_KEY) {
    return res.status(500).json({ error: 'NOUS_API_KEY not configured in Vercel env vars' });
  }

  try {
    const response = await fetch('https://portal.nousresearch.com/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOUS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'hermes-4-70b',
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
      console.error('Nous Portal error:', err);
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
