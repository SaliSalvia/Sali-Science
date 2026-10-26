/**
 * Axiom Jury - optional self-hosted Gemini proxy.
 * Keeps GEMINI_API_KEY on the server so the browser never sees it.
 * Usage: npm run build && npm run serve   (expects dist/ and .env with GEMINI_API_KEY)
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static('dist'));

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }
    const { prompt, systemInstruction, model = 'gemini-2.5-flash', inlineData = [] } = req.body || {};
    if (typeof prompt !== 'string' || prompt.length === 0) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const contents = [...inlineData, { text: prompt }];
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction, temperature: 0.2 },
    });
    res.json({ text: response.text || '' });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Gemini API error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Axiom Jury proxy listening on port ' + port));
