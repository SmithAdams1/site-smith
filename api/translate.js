// POST /api/translate
//   { texts: ["..."], target: "pt" }    -> { translations: ["..."] }
// Reusa GEMINI_API_KEY (mesmo modelo de api/chat.js).
// Preserva tags HTML inline (<strong>, <em>, <a>, <br>).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texts, target } = req.body || {};
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'texts array is required' });
  }
  if (texts.length > 80) {
    return res.status(400).json({ error: 'maximum 80 texts per request' });
  }
  const tgt = (target || 'pt').toLowerCase();
  const targetLabel = tgt === 'pt' ? 'Brazilian Portuguese (pt-BR)'
                     : tgt === 'en' ? 'English'
                     : tgt;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const prompt =
    `Translate each of the following texts from English to ${targetLabel}.\n` +
    `Rules:\n` +
    `- Preserve any inline HTML tags exactly (<strong>, <em>, <a href="...">, <br>, <span>, etc.)\n` +
    `- Preserve placeholders like {{name}} or %s if present.\n` +
    `- Keep punctuation and capitalization style natural for ${targetLabel}.\n` +
    `- Do NOT add explanations or notes.\n` +
    `- Return ONLY a JSON array of translated strings, in the same order as the input.\n\n` +
    `INPUT (JSON array):\n${JSON.stringify(texts)}`;

  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      console.error('[translate] Gemini error', aiRes.status, aiData);
      return res.status(502).json({ error: 'Translation upstream error' });
    }
    const raw = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return res.status(502).json({ error: 'Empty translation response' });
    }
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let translations;
    try {
      translations = JSON.parse(cleaned);
    } catch (e) {
      console.error('[translate] JSON parse fail. raw:', raw.slice(0, 500));
      return res.status(502).json({ error: 'Translation returned invalid JSON' });
    }
    if (!Array.isArray(translations) || translations.length !== texts.length) {
      return res.status(502).json({ error: 'Translation count mismatch' });
    }
    return res.status(200).json({ translations });
  } catch (err) {
    console.error('[translate] error:', err.message);
    return res.status(500).json({ error: 'Translation service unavailable' });
  }
}
