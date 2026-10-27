/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Key, Download, Cpu, ShieldCheck, Sparkles, FolderArchive } from 'lucide-react';
import { Logo } from './Logo.tsx';
import { SupportedModelId, SUPPORTED_MODELS } from '../lib/geminiClient.ts';

interface HeaderProps {
  apiKey: string;
  selectedModel: SupportedModelId;
  onOpenKeyModal: () => void;
  onExportZip: () => void;
  filesCount: number;
  archivesCount: number;
  onOpenEvaluation?: () => void;
  hasEvaluation?: boolean;
}

const HeaderBase: React.FC<HeaderProps> = ({
  apiKey,
  selectedModel,
  onOpenKeyModal,
  onExportZip,
  filesCount,
  archivesCount,
  onOpenEvaluation,
  hasEvaluation,
}) => {
  const modelInfo = SUPPORTED_MODELS.find(m => m.id === selectedModel);

  return (
    <header className="h-14 bg-[#08101E] border-b border-slate-800 px-3 md:px-5 flex items-center justify-between shrink-0 select-none z-20">
      
      {/* Brand & Identity */}
      <div className="flex items-center gap-2.5">
        <Logo size={32} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm md:text-base text-white tracking-wide">
              Axiom Jury
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.2 text-[10px] font-semibold bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-full">
              داوری علمی و اختراعات
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden md:block">
            سامانه بین‌المللی ارزیابی سخت‌گیرانه، اعتبارسنجی فیزیکی و تدوین پتنت
          </p>
        </div>
      </div>

      {/* Right Tools & Status */}
      <div className="flex items-center gap-2">
        
        {/* Model Indicator */}
        <button
          onClick={onOpenKeyModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          title="تغییر مدل جمنای یا کلید"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-cyan-300 font-medium">{selectedModel}</span>
        </button>

        {/* API Key Status Button */}
        <button
          onClick={onOpenKeyModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
            apiKey
              ? 'bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60'
              : 'bg-rose-950/80 border border-rose-500/50 text-rose-300 hover:bg-rose-900 animate-pulse'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>{apiKey ? 'کلید API فعال' : 'تنظیم کلید API'}</span>
        </button>

        {/* Export Modified ZIP */}
        {filesCount > 0 && (
          <button
            onClick={onExportZip}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950 transition-all cursor-pointer"
            title="دانلود بسته کامل پروژه به صورت ZIP"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروجی کل پروژه ZIP</span>
          </button>
        )}
      </div>
    </header>
  );
};

// Memoized: Header only depends on these props; callbacks are pure setters
// or ref-based reads in App.tsx, so identity changes are safe to ignore.
export const Header = React.memo(HeaderBase, (prev, next) =>
  prev.apiKey === next.apiKey &&
  prev.selectedModel === next.selectedModel &&
  prev.filesCount === next.filesCount &&
  prev.archivesCount === next.archivesCount &&
  prev.hasEvaluation === next.hasEvaluation
);
