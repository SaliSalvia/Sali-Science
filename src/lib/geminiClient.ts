/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { VirtualFile } from './types.ts';

export const SUPPORTED_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (سریع، کم‌هزینه و آزاد - پیشنهادی)',
    description: 'مدل نسل جدید با سرعت فوق‌العاده بالا، پنجره زمینه ۱ میلیون توکن و سهمیه رایگان سخاوتمندانه',
    recommended: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (عمیق‌ترین تحلیل و استدلال علمی)',
    description: 'بهترین برای داوری‌های بسیار پیچیده ریاضیاتی، استخراج ادعاهای ثبت اختراع و ممیزی کدهای C',
    recommended: false,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash (پایدار)',
    description: 'مدل پایدار نسل پیشین برای پروژه‌های سبک و پاسخ‌های سریع',
    recommended: false,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'مدل حرفه‌ای نسل پیشین با پنجره زمینه طولانی',
    recommended: false,
  },
] as const;

export type SupportedModelId = typeof SUPPORTED_MODELS[number]['id'];

/**
 * Validates a Gemini API Key by making a minimal test call
 */
export async function validateGeminiApiKey(
  apiKey: string,
  modelName: SupportedModelId = 'gemini-2.5-flash'
): Promise<{ isValid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length < 15) {
    return { isValid: false, error: 'کلید API وارد شده معتبر یا کامل نیست.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: 'Ping: responds with "OK" if active.',
    });

    if (response && response.text) {
      return { isValid: true };
    }
    return { isValid: false, error: 'پاسخی از سرویس جمنای دریافت نشد.' };
  } catch (error: any) {
    console.error('API Key validation error:', error);
    let msg = error?.message || 'خطا در ارتباط با سرور گوگل جمنای';
    if (msg.includes('API_KEY_INVALID') || msg.includes('403')) {
      msg = 'کلید API نامعتبر است. لطفاً کلید صحیح را از Google AI Studio دریافت کنید.';
    } else if (msg.includes('QUOTA_EXCEEDED') || msg.includes('429')) {
      msg = 'سهمیه استفاده از مدل پر شده است یا محدودیت نرخ درخواست فعال است.';
    }
    return { isValid: false, error: msg };
  }
}

/**
 * Executes a prompt with optional file attachments (multimodal inlineData for PDFs/Images, text for code).
 * Supports two modes:
 *  - direct mode (default): browser talks to Gemini with the user's API key
 *  - proxy mode (useProxy): all calls go through server/proxy.js so the key stays server-side.
 *    Streaming responses arrive as Server-Sent Events on /api/gemini/stream.
 * When responseSchema is provided, structured output (responseMimeType application/json)
 * is used so the jury evaluation is guaranteed to be valid JSON.
 */
const DEFAULT_SYSTEM_INSTRUCTION =
  'You are an elite International Scientific Jury & Patent Examiner.';

async function executeViaProxy({
  modelName,
  prompt,
  systemInstruction,
  inlineData,
  onStreamChunk,
  responseSchema,
}: {
  modelName: SupportedModelId;
  prompt: string;
  systemInstruction?: string;
  inlineData: any[];
  onStreamChunk?: (chunk: string) => void;
  responseSchema?: any;
}): Promise<string> {
  const useStream = !!onStreamChunk && !responseSchema;
  const endpoint = useStream ? '/api/gemini/stream' : '/api/gemini';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      prompt,
      systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      inlineData,
      responseSchema,
    }),
  });

  if (!res.ok) {
    let message = 'Proxy error (HTTP ' + res.status + ')';
    try {
      const errBody = await res.json();
      if (errBody && errBody.error) message = errBody.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (!useStream) {
    const data = await res.json();
    return data.text || '';
  }

  // Read the SSE stream and forward chunks to the UI
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const event of events) {
      const payload = event.replace(/^data:\s?/, '').trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.text) {
          fullText += parsed.text;
          if (onStreamChunk) onStreamChunk(parsed.text);
        }
      } catch {
        // ignore malformed / partial events
      }
    }
  }
  return fullText;
}

export async function executeGeminiPrompt({
  apiKey,
  modelName,
  prompt,
  systemInstruction,
  files = [],
  onStreamChunk,
  useProxy = false,
  responseSchema,
}: {
  apiKey: string;
  modelName: SupportedModelId;
  prompt: string;
  systemInstruction?: string;
  files?: VirtualFile[];
  onStreamChunk?: (chunk: string) => void;
  useProxy?: boolean;
  responseSchema?: any;
}): Promise<string> {
  // Prepare multimodal parts (PDFs/Images become inlineData)
  const inlineData: any[] = [];
  for (const file of files) {
    if (file.isBinary && file.content.startsWith('data:')) {
      const mimeMatch = file.content.match(/^data:([^;]+);base64,(.+)$/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        const data = mimeMatch[2];
        // Gemini supports images and application/pdf natively
        if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
          inlineData.push({ mimeType, data });
        }
      }
    }
  }

  // Proxy mode: the API key never touches the browser
  if (useProxy) {
    return executeViaProxy({ modelName, prompt, systemInstruction, inlineData, onStreamChunk, responseSchema });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const contentsParts: any[] = [...inlineData, { text: prompt }];
  const config: any = {
    systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
    temperature: 0.2, // Low temperature for maximum scientific precision and strict determinism
  };
  if (responseSchema) {
    // Structured output: guarantees valid JSON matching the jury contract
    config.responseMimeType = 'application/json';
    config.responseSchema = responseSchema;
  }

  try {
    if (responseSchema) {
      // Structured jury output: non-streaming for maximum JSON fidelity
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contentsParts,
        config,
      });
      return response.text || '';
    } else if (onStreamChunk) {
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: contentsParts,
        config,
      });

      let fullText = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          onStreamChunk(text);
        }
      }
      return fullText;
    } else {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contentsParts,
        config,
      });
      return response.text || '';
    }
  } catch (error: any) {
    console.error('Gemini Execution error:', error);
    throw new Error(error?.message || 'خطا در ارتباط با مدل جمنای');
  }
}
