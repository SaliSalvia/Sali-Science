/**
 * Axiom Jury - optional self-hosted Gemini proxy.
 * Keeps GEMINI_API_KEY on the server so the browser never sees it.
 * Endpoints:
 *   POST /api/gemini         -> non-streaming JSON response (supports responseSchema)
 *   POST /api/gemini/stream  -> Server-Sent Events streaming (text chunks)
 * Usage:
 *   VITE_API_MODE=proxy npm run build   # client build in proxy mode
 *   npm run serve                        # expects dist/ and .env with GEMINI_API_KEY
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const DEFAULT_SYSTEM_INSTRUCTION =
  'You are an elite International Scientific Jury & Patent Examiner.';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static('dist'));

function extractRequest(req) {
  const { prompt, systemInstruction, model = 'gemini-2.5-flash', inlineData = [], responseSchema } = req.body || {};
  if (typeof prompt !== 'string' || prompt.length === 0) {
    return null;
  }
  const config = {
    systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
    temperature: 0.2,
  };
  if (responseSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = responseSchema;
  }
  return { model, contents: [...inlineData, { text: prompt }], config };
}

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }
    const payload = extractRequest(req);
    if (!payload) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent(payload);
    res.json({ text: response.text || '' });
  } catch (err) {
    res.status(500).json({ error: (err && err.message) || 'Gemini API error' });
  }
});

app.post('/api/gemini/stream', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }
    const payload = extractRequest(req);
    if (!payload) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const responseStream = await ai.models.generateContentStream(payload);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    for await (const chunk of responseStream) {
      const text = chunk.text || '';
      if (text) {
        res.write('data: ' + JSON.stringify({ text }) + '\n\n');
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(500).json({ error: (err && err.message) || 'Gemini API error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Axiom Jury proxy listening on port ' + port));
