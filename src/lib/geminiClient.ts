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
 * Executes a prompt with optional file attachments (multimodal inlineData for PDFs/Images, text for code)
 */
export async function executeGeminiPrompt({
  apiKey,
  modelName,
  prompt,
  systemInstruction,
  files = [],
  onStreamChunk,
}: {
  apiKey: string;
  modelName: SupportedModelId;
  prompt: string;
  systemInstruction?: string;
  files?: VirtualFile[];
  onStreamChunk?: (chunk: string) => void;
}): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  // Prepare contents parts
  const contentsParts: any[] = [];

  // Add binary files (PDFs, Images) as inlineData if present
  for (const file of files) {
    if (file.isBinary && file.content.startsWith('data:')) {
      const mimeMatch = file.content.match(/^data:([^;]+);base64,(.+)$/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        const data = mimeMatch[2];
        // Gemini supports images and application/pdf natively
        if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
          contentsParts.push({
            inlineData: {
              mimeType,
              data,
            },
          });
        }
      }
    }
  }

  // Add the textual prompt
  contentsParts.push({ text: prompt });

  try {
    if (onStreamChunk) {
      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: contentsParts,
        config: {
          systemInstruction: systemInstruction || 'You are an elite International Scientific Jury & Patent Examiner.',
          temperature: 0.2, // Low temperature for maximum scientific precision and strict determinism
        },
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
        config: {
          systemInstruction: systemInstruction || 'You are an elite International Scientific Jury & Patent Examiner.',
          temperature: 0.2,
        },
      });
      return response.text || '';
    }
  } catch (error: any) {
    console.error('Gemini Execution error:', error);
    throw new Error(error?.message || 'خطا در ارتباط با مدل جمنای');
  }
}
