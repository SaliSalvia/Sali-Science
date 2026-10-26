/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Award, 
  GitMerge, 
  Atom, 
  FileCheck2, 
  Wrench, 
  Copy, 
  Check, 
  ShieldCheck, 
  FileCode,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { ChatMessage, VirtualFile, ProposedEdit } from '../lib/types.ts';
import { Logo } from './Logo.tsx';

interface ChatAndWorkbenchProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  streamingText: string;
  files: VirtualFile[];
  onTriggerPreset: (promptText: string) => void;
  onOpenEvaluation: () => void;
  onOpenBatchEdits: (edits: ProposedEdit[]) => void;
  hasEvaluation: boolean;
  latestProposedEdits: ProposedEdit[];
}

export const ChatAndWorkbench: React.FC<ChatAndWorkbenchProps> = ({
  messages,
  onSendMessage,
  isLoading,
  streamingText,
  files,
  onTriggerPreset,
  onOpenEvaluation,
  onOpenBatchEdits,
  hasEvaluation,
  latestProposedEdits,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPresets = [
    {
      icon: <Award className="w-3.5 h-3.5 text-cyan-400" />,
      label: 'داوری جامع علمی و اعتبارسنجی اختراع',
      prompt: 'لطفاً پروژه و تمامی فایل‌های بارگذاری شده را از دیدگاه هیئت داوران بین‌المللی ارزیابی کرده، تمام ضعف‌ها و نقایص را با تفکیک قابلیت حل توسط هوش مصنوعی در برابر تست آزمایشگاهی مشخص کن و اصلاحیه‌های لازم را آماده نما.',
    },
    {
      icon: <GitMerge className="w-3.5 h-3.5 text-purple-400" />,
      label: 'مقایسه ۵ یا چند نسخه و سنتز برترین ترکیب',
      prompt: 'نسخه‌های مختلف بارگذاری شده در آرشیوها را با یکدیگر مقایسه کن، بهترین و کامل‌ترین ورژن را انتخاب کرده و یک سنتز بهینه ترکیبی از بهترین نقاط قوت هر نسخه استخراج کن.',
    },
    {
      icon: <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />,
      label: 'تدوین ادعاهای رسمی اختراع (USPTO/PCT)',
      prompt: 'با توجه به اسناد و کدهای موجود، ادعاهای مستقل و وابسته ثبت اختراع را بر اساس استانداردهای بین‌المللی WIPO به شکل دقیق و نفوذناپذیر در برابر هنر قبلی (Prior Art) تدوین کن.',
    },
    {
      icon: <Atom className="w-3.5 h-3.5 text-cyan-400" />,
      label: 'بررسی بقای انرژی و قوانین فیزیک',
      prompt: 'طرح را از منظر اصول اولیه فیزیک، بقای ماده و انرژی، ترمودینامیک و سازگاری ابعادی فرمول‌ها با سخت‌گیری حداکثری ممیزی کن.',
    },
    {
      icon: <Wrench className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'اصلاح باگ‌ها و تولید Patch کامل کد',
      prompt: 'کدهای C و Python را بررسی کرده و برای رفع تمامی خطاهای احتمالی، سرریزهای حافظه و باگ‌های الگوریتمی، نسخه‌های اصلاح‌شده و کامل کدها را در قالب پیشنهادات ادیت آماده کن تا مجوز اعمال بگیرم.',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#070E1B] text-slate-100 overflow-hidden">
      
      {/* Quick Actions Header Toolbar */}
      <div className="p-2.5 bg-[#091426] border-b border-slate-800 flex items-center gap-2 overflow-x-auto select-none">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1 pl-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>فرمان‌های تخصصی داوری:</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {quickPresets.map((preset, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading || files.length === 0}
              onClick={() => onTriggerPreset(preset.prompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white transition-all disabled:opacity-40 cursor-pointer shrink-0"
            >
              {preset.icon}
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Status Bar if Evaluation exists */}
      {hasEvaluation && (
        <div className="px-4 py-2 bg-gradient-to-r from-[#0C1B33] to-[#0A172C] border-b border-cyan-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-200">گزارش داوری هیئت علمی بین‌المللی تولید شده است.</span>
          </div>
          <div className="flex items-center gap-2">
            {latestProposedEdits.length > 0 && (
              <button
                onClick={() => onOpenBatchEdits(latestProposedEdits)}
                className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-medium hover:bg-cyan-900 transition-colors"
              >
                بررسی مجوز اصلاحات ({latestProposedEdits.length})
              </button>
            )}
            <button
              onClick={onOpenEvaluation}
              className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors shadow-sm"
            >
              مشاهده کارنامه داوری
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {messages.length === 0 && !streamingText ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
            <Logo size={56} />
            <div>
              <h3 className="font-bold text-base text-white">میزکار هوشمند داوری و توسعه علمی</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                این دستیار اختصاصی به عنوان یک تیم داوری سخت‌گیر بین‌المللی، پروژه‌ها، مقالات، اختراعات و کدهای شما را با ریزبینی اعتبارسنجی کرده و ضعف‌ها را با تفکیک قابلیت اصلاح گزارش می‌دهد.
              </p>
            </div>
            {files.length === 0 ? (
              <p className="text-[11px] text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/30 px-3 py-2 rounded-xl">
                ابتدا فایل‌های پروژه (فایل‌های ZIP یا فایل‌های منفرد) را در ستون سمت راست بارگذاری کنید.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-400/80 bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl">
                {files.length} فایل در مخزن آماده است. از دکمه‌های بالا یا کادر پایین برای شروع داوری استفاده کنید.
              </p>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 mt-0.5">
                    <Logo size={28} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 space-y-2.5 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-700 to-cyan-700 text-white shadow-md'
                      : 'bg-[#0B1528] border border-slate-800 text-slate-200 shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 pb-1 border-b border-white/10">
                    <span className="font-semibold text-[11px] opacity-80">
                      {msg.role === 'user' ? 'پژوهشگر / مخترع' : 'هیئت داوران علمی Axiom'}
                    </span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                      title="کپی متن"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                    {msg.content}
                  </div>

                  {/* Attached Evaluation card button if message includes evaluation */}
                  {msg.evaluation && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-cyan-300 font-medium">
                        امتیاز داوری: {msg.evaluation.overallScore}/100
                      </span>
                      <button
                        onClick={onOpenEvaluation}
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold transition-colors"
                      >
                        مشاهده کارنامه کامل
                      </button>
                    </div>
                  )}

                  {/* Pending edits button */}
                  {msg.pendingEdits && msg.pendingEdits.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-amber-300">
                        {msg.pendingEdits.length} فایل اصلاحی در انتظار مجوز
                      </span>
                      <button
                        onClick={() => onOpenBatchEdits(msg.pendingEdits!)}
                        className="px-3 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[11px] font-bold transition-colors"
                      >
                        بررسی و صدور مجوز
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live Streaming Assistant Message */}
            {isLoading && (
              <div className="flex gap-3 text-xs leading-relaxed justify-start">
                <div className="shrink-0 mt-0.5">
                  <Logo size={28} />
                </div>
                <div className="max-w-[85%] md:max-w-[75%] rounded-2xl p-4 bg-[#0B1528] border border-cyan-500/30 text-slate-200 shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-medium text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>هیئت داوران در حال ممیزی و تحلیل عمیق علمی...</span>
                  </div>
                  {streamingText ? (
                    <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                      {streamingText}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form Bar (DeepSeek style) */}
      <div className="p-3 bg-[#091426] border-t border-slate-800 select-none">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative bg-[#060D19] border border-slate-700/80 rounded-2xl p-2 focus-within:border-cyan-400 transition-colors">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                files.length === 0
                  ? 'ابتدا فایل‌های پروژه را بارگذاری کنید یا سوال علمی بپرسید...'
                  : 'دستور یا سوال خود را بنویسید (مثال: بررسی استحکام ادعای ۲ در برابر هنر قبلی، رفع باگ حافظه در magneto.c)...'
              }
              rows={2}
              className="w-full bg-transparent resize-none text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none px-2 py-1 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 px-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-[10px]">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>{files.length} فایل در دسترس برای تحلیل</span>
              </span>
              <span>Enter برای ارسال • Shift+Enter برای خط جدید</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all cursor-pointer shrink-0"
            aria-label="ارسال"
          >
            <Send className="w-5 h-5 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
