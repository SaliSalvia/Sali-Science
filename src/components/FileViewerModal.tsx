/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Save, 
  FileCode, 
  Copy, 
  Check, 
  Eye, 
  Edit3, 
  Sparkles, 
  Clock,
  Layers
} from 'lucide-react';
import { VirtualFile } from '../lib/types.ts';
import { formatFileSize, triggerFileDownload } from '../lib/fileSystem.ts';

interface FileViewerModalProps {
  file: VirtualFile | null;
  onClose: () => void;
  onSaveContent: (fileId: string, newContent: string) => void;
  onRequestCritique: (file: VirtualFile) => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  file,
  onClose,
  onSaveContent,
  onRequestCritique,
}) => {
  if (!file) return null;

  const [content, setContent] = useState(file.content);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'rendered'>('raw');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setContent(file.content);
    setHasUnsavedChanges(false);
    setIsEditing(false);
    if (file.extension === 'md' || file.extension === 'docx') {
      setViewMode('rendered');
    } else {
      setViewMode('raw');
    }
  }, [file]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (file.isBinary) {
      // Decode and download
      const base64Index = file.content.indexOf(';base64,');
      if (base64Index !== -1) {
        const rawBase64 = file.content.substring(base64Index + 8);
        const byteCharacters = atob(rawBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.mimeType });
        triggerFileDownload(blob, file.name, file.mimeType);
      }
    } else {
      triggerFileDownload(content, file.name, file.mimeType);
    }
  };

  const handleSave = () => {
    onSaveContent(file.id, content);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  const lines = content.split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-[#0B1528] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#08101E] border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-white truncate" dir="ltr">
                  {file.path}
                </h3>
                {file.isModified && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-950 border border-emerald-500/50 text-emerald-300 rounded">
                    اصلاح شده
                  </span>
                )}
                {file.versionTag && (
                  <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-cyan-300 rounded border border-slate-700">
                    {file.versionTag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                <span>حجم: {formatFileSize(file.size)}</span>
                <span>•</span>
                <span>تعداد خطوط: {file.isBinary ? 'باینری' : lines.length}</span>
                {file.archiveName && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      {file.archiveName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!file.isBinary && (file.extension === 'md' || file.extension === 'docx') && (
              <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  onClick={() => setViewMode('rendered')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'rendered' ? 'bg-cyan-500 text-slate-950 font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  نمایش فرمت شده
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'raw' ? 'bg-cyan-500 text-slate-950 font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  متن خام / ویرایش
                </button>
              </div>
            )}

            {!file.isBinary && (
              <button
                onClick={() => {
                  if (isEditing) {
                    handleSave();
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isEditing
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {isEditing ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>ذخیره تغییرات</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ویرایش مستقیم</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => onRequestCritique(file)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>داوری اختصاصی این فایل</span>
            </button>

            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="کپی محتوا"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="دانلود فایل منفرد"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 overflow-auto bg-[#070E1B] p-4 font-mono text-xs">
          {file.isBinary ? (
            file.mimeType.startsWith('image/') ? (
              <div className="h-full flex flex-col items-center justify-center p-6">
                <img
                  src={file.content}
                  alt={file.name}
                  className="max-h-[70vh] max-w-full rounded-xl border border-slate-700 shadow-2xl object-contain"
                />
              </div>
            ) : file.mimeType === 'application/pdf' ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <p className="text-slate-300 text-sm">سند PDF بارگذاری شده است.</p>
                <iframe
                  src={file.content}
                  title={file.name}
                  className="w-full h-[70vh] rounded-xl border border-slate-800"
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                فایل باینری ({file.mimeType}) با موفقیت بارگذاری شده و آماده تحلیل چندوجهی توسط هوش مصنوعی است.
              </div>
            )
          ) : viewMode === 'rendered' ? (
            <div className="max-w-4xl mx-auto p-6 bg-[#0B1528] rounded-xl border border-slate-800/80 font-sans leading-relaxed space-y-4 text-slate-200" dir="rtl">
              <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                {content}
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-full font-mono text-[12.5px] leading-relaxed text-slate-200" dir="ltr">
              {/* Line Numbers Column */}
              <div className="select-none pr-4 pl-2 text-right text-slate-600 border-r border-slate-800 shrink-0 font-mono">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Code Editor or Viewer */}
              {isEditing ? (
                <textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full flex-1 pl-4 bg-transparent resize-none focus:outline-none font-mono text-cyan-100 selection:bg-cyan-500/30 overflow-hidden leading-relaxed"
                  rows={Math.max(lines.length + 5, 20)}
                  spellCheck={false}
                />
              ) : (
                <div className="w-full flex-1 pl-4 whitespace-pre overflow-x-auto text-slate-200 font-mono">
                  {content}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unsaved changes footer alert */}
        {hasUnsavedChanges && (
          <div className="px-4 py-2.5 bg-yellow-950/80 border-t border-yellow-500/30 flex items-center justify-between text-xs text-yellow-200">
            <span>تغییراتی در متن فایل ایجاد شده است اما هنوز ذخیره نشده.</span>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg shadow-sm"
            >
              ذخیره اکنون
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
