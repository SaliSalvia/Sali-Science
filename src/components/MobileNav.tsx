/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MessageSquare, FolderTree, Award, ShieldCheck } from 'lucide-react';

interface MobileNavProps {
  activeTab: 'chat' | 'files' | 'jury' | 'edits';
  onChangeTab: (tab: 'chat' | 'files' | 'jury' | 'edits') => void;
  filesCount: number;
  hasEvaluation: boolean;
  pendingEditsCount: number;
}

const MobileNavBase: React.FC<MobileNavProps> = ({
  activeTab,
  onChangeTab,
  filesCount,
  hasEvaluation,
  pendingEditsCount,
}) => {
  return (
    <nav className="md:hidden h-14 bg-[#08101E] border-t border-slate-800 flex items-center justify-around px-2 shrink-0 select-none z-20 pb-safe">
      <button
        onClick={() => onChangeTab('chat')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-colors ${
          activeTab === 'chat' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <MessageSquare className="w-5 h-5 mb-0.5" />
        <span>میزکار چت</span>
      </button>

      <button
        onClick={() => onChangeTab('files')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-colors ${
          activeTab === 'files' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <FolderTree className="w-5 h-5 mb-0.5" />
        <span>فایل‌ها</span>
        {filesCount > 0 && (
          <span className="absolute top-1 right-1/4 px-1 rounded-full text-[8px] bg-cyan-500 text-slate-950 font-bold">
            {filesCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onChangeTab('jury')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-colors ${
          activeTab === 'jury' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Award className="w-5 h-5 mb-0.5" />
        <span>داوری علمی</span>
        {hasEvaluation && (
          <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-cyan-400" />
        )}
      </button>

      <button
        onClick={() => onChangeTab('edits')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-colors ${
          activeTab === 'edits' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <ShieldCheck className="w-5 h-5 mb-0.5" />
        <span>مجوز اصلاح</span>
        {pendingEditsCount > 0 && (
          <span className="absolute top-1 right-1/4 px-1 rounded-full text-[8px] bg-amber-400 text-slate-950 font-bold animate-pulse">
            {pendingEditsCount}
          </span>
        )}
      </button>
    </nav>
  );
};

// Memoized: onChangeTab is a stable pure setter, safe to ignore.
export const MobileNav = React.memo(MobileNavBase, (prev, next) =>
  prev.activeTab === next.activeTab &&
  prev.filesCount === next.filesCount &&
  prev.hasEvaluation === next.hasEvaluation &&
  prev.pendingEditsCount === next.pendingEditsCount
);
