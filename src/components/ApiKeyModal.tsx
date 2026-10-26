/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Sparkles, X } from 'lucide-react';
import { SUPPORTED_MODELS, SupportedModelId, validateGeminiApiKey } from '../lib/geminiClient.ts';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string, model: SupportedModelId) => void;
  selectedModel: SupportedModelId;
  forceRequired?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
  selectedModel,
  forceRequired = false,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [model, setModel] = useState<SupportedModelId>(selectedModel);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!inputKey.trim()) {
      setVerifyStatus('error');
      setStatusMessage('لطفاً ابتدا کلید API را وارد کنید.');
      return;
    }

    setIsVerifying(true);
    setVerifyStatus('idle');
    setStatusMessage('');

    const res = await validateGeminiApiKey(inputKey.trim(), model);
    setIsVerifying(false);

    if (res.isValid) {
      setVerifyStatus('success');
      setStatusMessage('اتصال با موفقیت برقرار شد! کلید معتبر و آماده داوری علمی است.');
    } else {
      setVerifyStatus('error');
      setStatusMessage(res.error || 'کلید API نامعتبر است.');
    }
  };

  const handleSave = () => {
    if (!inputKey.trim()) {
      setVerifyStatus('error');
      setStatusMessage('ورود کلید API الزامی است.');
      return;
    }
    onSaveKey(inputKey.trim(), model);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0D1B2E] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl text-slate-100 overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">پیکربندی کلید هوش مصنوعی Google Gemini</h3>
              <p className="text-xs text-slate-400">تنها با کلید API گوگل (رایگان) با نهایت دقت علمی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              کلید API گوگل جمنای (Google Gemini API Key)
            </label>
            <div className="relative">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setVerifyStatus('idle');
                }}
                placeholder="AIzaSy..."
                className="w-full px-4 py-2.5 bg-[#070E1B] border border-slate-700 rounded-xl text-sm text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono tracking-wider"
                dir="ltr"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">کلید ندارید؟ دریافت رایگان در ۱ دقیقه:</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                <span>دریافت رایگان از Google AI Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              مدل محاسباتی هوش مصنوعی
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as SupportedModelId)}
              className="w-full px-3.5 py-2.5 bg-[#070E1B] border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {SUPPORTED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              {SUPPORTED_MODELS.find((m) => m.id === model)?.description}
            </p>
          </div>

          {/* Verification feedback */}
          {verifyStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {verifyStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Security & Client-Side Notice */}
          <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-cyan-200/90">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">حریم خصوصی و پردازش محلی:</span> کلید شما صرفاً در
              حافظه محلی مرورگر (Local Storage) ذخیره شده و تمام درخواست‌ها مستقیماً و بدون واسطه به API گوگل ارسال می‌شود.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-700/60">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || !inputKey.trim()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>در حال بررسی...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>بررسی تست اتصال</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
            >
              کاوش موقت در رابط کاربری
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!inputKey.trim()}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            ذخیره و فعال‌سازی
          </button>
        </div>
      </div>
    </div>
  );
};
