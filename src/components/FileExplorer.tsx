/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileCheck, 
  FileSpreadsheet, 
  FileArchive, 
  Upload, 
  Download, 
  Search, 
  Plus, 
  Layers, 
  Trash2,
  Sparkles
} from 'lucide-react';
import { VirtualFile, FileTreeNode, ZipArchive } from '../lib/types.ts';
import { formatFileSize, buildFileTree } from '../lib/fileSystem.ts';

interface FileExplorerProps {
  files: VirtualFile[];
  archives: ZipArchive[];
  selectedFileId: string | null;
  onSelectFile: (file: VirtualFile) => void;
  onUploadZip: (file: File) => void;
  onUploadSingleFile: (file: File) => void;
  onLoadSampleProjects: () => void;
  onExportZip: () => void;
  onClearFiles: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  archives,
  selectedFileId,
  onSelectFile,
  onUploadZip,
  onUploadSingleFile,
  onLoadSampleProjects,
  onExportZip,
  onClearFiles,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});

  const toggleDirectory = (path: string) => {
    setCollapsedDirs((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const tree = useMemo(() => {
    return buildFileTree(filteredFiles);
  }, [filteredFiles]);

  const handleZipInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (uploaded && uploaded.length > 0) {
      for (let i = 0; i < uploaded.length; i++) {
        const f = uploaded[i];
        if (f.name.toLowerCase().endsWith('.zip')) {
          onUploadZip(f);
        } else {
          onUploadSingleFile(f);
        }
      }
    }
    e.target.value = '';
  };

  const getFileIcon = (ext?: string) => {
    switch (ext?.toLowerCase()) {
      case 'c':
      case 'h':
      case 'cpp':
        return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'py':
        return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-slate-300 shrink-0" />;
      case 'docx':
        return <FileCheck className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'json':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const renderTree = (nodes: FileTreeNode[], depth = 0) => {
    return (
      <div className="space-y-0.5">
        {nodes.map((node) => {
          if (node.isDirectory) {
            const isCollapsed = !!collapsedDirs[node.path];
            return (
              <div key={node.path} className="select-none">
                <button
                  type="button"
                  onClick={() => toggleDirectory(node.path)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors text-right"
                  style={{ paddingRight: `${Math.max(8, depth * 14)}px` }}
                >
                  {isCollapsed ? (
                    <Folder className="w-4 h-4 text-cyan-500/80 shrink-0" />
                  ) : (
                    <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                  <span className="truncate flex-1 font-mono text-[11.5px]">{node.name}/</span>
                  <span className="text-[10px] text-slate-500">
                    {node.children ? `(${node.children.length})` : ''}
                  </span>
                </button>
                {!isCollapsed && node.children && (
                  <div className="border-r border-slate-800/80 mr-2.5">
                    {renderTree(node.children, depth + 1)}
                  </div>
                )}
              </div>
            );
          }

          const file = files.find((f) => f.id === node.fileId || f.path === node.path);
          const isSelected = selectedFileId === file?.id;

          return (
            <button
              key={node.path}
              type="button"
              onClick={() => file && onSelectFile(file)}
              className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-right group ${
                isSelected
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
              style={{ paddingRight: `${Math.max(8, depth * 14)}px` }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {getFileIcon(node.extension)}
                <span className="truncate font-mono text-[11.5px]" title={node.name}>
                  {node.name}
                </span>
                {file?.isModified && (
                  <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-950 border border-emerald-500/50 text-emerald-300 rounded">
                    اصلاح شده
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0 font-mono">
                {file?.versionTag && (
                  <span className="px-1 rounded bg-slate-800/90 text-cyan-300/80 text-[9px]">
                    {file.versionTag}
                  </span>
                )}
                <span>{node.size !== undefined ? formatFileSize(node.size) : ''}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#091426] border-l border-slate-800 text-slate-200 select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="font-bold text-xs text-white uppercase tracking-wider">مخزن فایل‌ها و پروژه‌ها</h2>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800">
            {files.length} فایل
          </span>
        </div>
        {files.length > 0 && (
          <button
            onClick={onClearFiles}
            title="پاکسازی مخزن"
            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Archives / Versions pill list if multi-zip loaded */}
      {archives.length > 0 && (
        <div className="p-2.5 bg-[#060D19] border-b border-slate-800/80">
          <div className="text-[10px] font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>آرشیوها / نسخه‌های فعال ({archives.length}):</span>
            <span className="text-cyan-400 font-medium text-[9px]">آماده سنتز و داوری</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {archives.map((arch) => (
              <div
                key={arch.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-[10px] text-slate-300"
              >
                <FileArchive className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[120px]" title={arch.name}>{arch.name}</span>
                <span className="text-[9px] text-slate-500">({arch.fileCount})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload & Actions Bar */}
      <div className="p-2.5 border-b border-slate-800/80 flex flex-col gap-1.5">
        <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium cursor-pointer transition-all shadow-sm">
          <Upload className="w-3.5 h-3.5" />
          <span>بارگذاری فایل ZIP یا اسناد (۱۰-۱۵ مگابایت)</span>
          <input
            type="file"
            multiple
            accept=".zip,.c,.h,.cpp,.py,.md,.txt,.docx,.pdf,.json,.csv,.tex"
            onChange={handleZipInput}
            className="hidden"
          />
        </label>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onLoadSampleProjects}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] transition-colors"
          >
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span>بارگذاری نسخه نمونه (چند آرشیو)</span>
          </button>

          {files.length > 0 && (
            <button
              onClick={onExportZip}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[11px] transition-colors shrink-0"
              title="خروجی کامل پروژه به ZIP جدید"
            >
              <Download className="w-3 h-3" />
              <span>خروجی ZIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      {files.length > 0 && (
        <div className="p-2 border-b border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در فایل‌ها و پوشه‌ها..."
              className="w-full pr-8 pl-2 py-1.5 bg-[#060D19] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      )}

      {/* Directory & File Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-3">
            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-cyan-400">
              <FileArchive className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">مخزن خالی است</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                یک یا چند فایل ZIP حاوی پروژه‌ها، مقالات، کدها یا اختراعات خود را بارگذاری کنید.
              </p>
            </div>
            <button
              onClick={onLoadSampleProjects}
              className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-xs hover:bg-cyan-900 transition-colors"
            >
              مشاهده پروژه نمونه چندنسخه‌ای
            </button>
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
};
