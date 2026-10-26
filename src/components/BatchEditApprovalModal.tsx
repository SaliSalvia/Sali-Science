/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle, 
  X, 
  FileCode, 
  ShieldAlert, 
  Sparkles, 
  GitCommit, 
  Check, 
  ArrowLeft,
  Download
} from 'lucide-react';
import { ProposedEdit, VirtualFile } from '../lib/types.ts';
import { computeLineDiff } from '../lib/juryEngine.ts';

interface BatchEditApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposedEdits: ProposedEdit[];
  virtualFiles: VirtualFile[];
  onApproveAndApply: (approvedEdits: ProposedEdit[]) => void;
  onExportZipAfterApply?: () => void;
}

export const BatchEditApprovalModal: React.FC<BatchEditApprovalModalProps> = ({
  isOpen,
  onClose,
  proposedEdits,
  virtualFiles,
  onApproveAndApply,
  onExportZipAfterApply,
}) => {
  if (!isOpen || proposedEdits.length === 0) return null;

  // Track approved state for each edit
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    proposedEdits.forEach((e) => {
      init[e.id] = true; // Selected by default for approval review
    });
    return init;
  });

  const [activeEditId, setActiveEditId] = useState<string>(proposedEdits[0].id);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    proposedEdits.forEach((e) => {
      next[e.id] = true;
    });
    setSelectedIds(next);
  };

  const deselectAll = () => {
    const next: Record<string, boolean> = {};
    proposedEdits.forEach((e) => {
      next[e.id] = false;
    });
    setSelectedIds(next);
  };

  const activeEdit = proposedEdits.find((e) => e.id === activeEditId) || proposedEdits[0];
  const targetVirtualFile = virtualFiles.find(
    (f) =>
      f.path.toLowerCase() === activeEdit.filePath.toLowerCase() ||
      f.name.toLowerCase() === activeEdit.filePath.toLowerCase()
  );

  const originalContent = targetVirtualFile ? targetVirtualFile.content : (activeEdit.originalSnippet || '');
  const newContent = activeEdit.newFullContent || activeEdit.newSnippet || '';
  const diffLines = computeLineDiff(originalContent, newContent);

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  const handleConfirm = () => {
    const approvedList = proposedEdits.map((e) => ({
      ...e,
      approved: !!selectedIds[e.id],
    }));
    onApproveAndApply(approvedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-[#0B1528] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#08101E] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  مجوز رسمی اعمال اصلاحات پروژه و کدها (Batch Code Patch Authorization)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {selectedCount} از {proposedEdits.length} فایل انتخاب شده
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تغییرات با بررسی دقیق دیف (Diff) و حفظ ۱۰۰٪ فرمت‌بندی استاندارد تنها با تایید مستقیم شما اعمال می‌شوند.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column (Files List & Rationale) */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-slate-800 bg-[#091426] flex flex-col">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">لیست فایل‌های پیشنهادی</span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  انتخاب همه
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-slate-400 hover:text-slate-300"
                >
                  لغو همه
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {proposedEdits.map((edit) => {
                const isSelected = !!selectedIds[edit.id];
                const isActive = edit.id === activeEditId;

                return (
                  <div
                    key={edit.id}
                    onClick={() => setActiveEditId(edit.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-cyan-950/70 border-cyan-500/50 shadow-sm'
                        : 'bg-[#0B1528] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(edit.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 cursor-pointer"
                      />
                      <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-mono text-[11.5px] truncate font-medium text-slate-200" dir="ltr">
                        {edit.filePath}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 pr-5">
                      {edit.rationale}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (Active File Diff Inspector) */}
          <div className="flex-1 flex flex-col bg-[#070E1B] overflow-hidden">
            {/* Diff toolbar */}
            <div className="px-4 py-2.5 bg-[#091426] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs text-cyan-200" dir="ltr">
                  {activeEdit.filePath}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> خطوط اضافه شده (+)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> خطوط حذف شده (-)
                </span>
              </div>
            </div>

            {/* Scientific Rationale Banner */}
            <div className="p-3 bg-cyan-950/30 border-b border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">استدلال علمی اصلاحیه: </span>
                <span>{activeEdit.rationale}</span>
              </div>
            </div>

            {/* Line Diff View */}
            <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed text-slate-200" dir="ltr">
              {diffLines.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  تغییری برای نمایش وجود ندارد.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {diffLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start px-2 py-0.5 rounded ${
                        line.type === 'added'
                          ? 'bg-emerald-950/70 text-emerald-200 border-l-2 border-emerald-400'
                          : line.type === 'removed'
                          ? 'bg-rose-950/70 text-rose-200 border-l-2 border-rose-400 line-through opacity-80'
                          : 'text-slate-400'
                      }`}
                    >
                      <span className="w-6 shrink-0 select-none text-[10px] text-slate-600 text-right pr-2">
                        {line.lineNumber || ''}
                      </span>
                      <span className="w-4 shrink-0 select-none font-bold">
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                      </span>
                      <span className="whitespace-pre overflow-x-auto flex-1 font-mono">
                        {line.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="px-5 py-3.5 bg-[#08101E] border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
          >
            انصراف و لغو
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-40 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>صدور مجوز و اعمال رسمی اصلاحات ({selectedCount} فایل)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
