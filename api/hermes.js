// api/hermes.js — Vercel Serverless Function
// AXIOM Intelligence Engine — Nous Research Inference API · Hermes 4

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

  const SYS_REASONING = `You are a deep thinking AI, you may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering. You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem.`;

  try {
    const response = await fetch('https://inference-api.nousresearch.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOUS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Hermes-4.3-36B',
        messages: system
          ? [
              { role: 'system', content: SYS_REASONING + '\n\n' + system },
              ...messages
            ]
          : messages,
        max_tokens,
        temperature: 0.75,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();

    // Strip <think>...</think> reasoning tags from output
    let text = data.choices?.[0]?.message?.content || '';
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    return res.status(200).json({ text, model: data.model, usage: data.usage });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
