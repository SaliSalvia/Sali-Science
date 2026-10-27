/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  VirtualFile, 
  ZipArchive, 
  JuryEvaluation, 
  ProposedEdit, 
  ChatMessage 
} from './lib/types.ts';
import { 
  unpackZipFile, 
  parseSingleUploadedFile, 
  exportFilesToZip, 
  triggerFileDownload 
} from './lib/fileSystem.ts';
import { 
  buildJuryPrompt, 
  parseJuryResponse, 
  applyApprovedEdits,
  JURY_RESPONSE_SCHEMA 
} from './lib/juryEngine.ts';
import { 
  SupportedModelId, 
  executeGeminiPrompt 
} from './lib/geminiClient.ts';
import { 
  SAMPLE_PROJECT_V1_FILES, 
  SAMPLE_PROJECT_V2_FILES, 
  SAMPLE_ARCHIVES,
  SAMPLE_JURY_EVALUATION
} from './lib/sampleProjects.ts';

import { Header } from './components/Header.tsx';
import { MobileNav } from './components/MobileNav.tsx';
import { FileExplorer } from './components/FileExplorer.tsx';
import { FileViewerModal } from './components/FileViewerModal.tsx';
import { JuryEvaluationView } from './components/JuryEvaluationView.tsx';
import { BatchEditApprovalModal } from './components/BatchEditApprovalModal.tsx';
import { ChatAndWorkbench } from './components/ChatAndWorkbench.tsx';
import { ApiKeyModal } from './components/ApiKeyModal.tsx';

// Server-proxy mode: build with VITE_API_MODE=proxy to route all Gemini calls
// through server/proxy.js so the API key never reaches the browser.
const USE_PROXY = import.meta.env.VITE_API_MODE === 'proxy';

export default function App() {
  // API Key & Model State
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('axiom_gemini_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState<SupportedModelId>(() => {
    const saved = localStorage.getItem('axiom_gemini_model') as SupportedModelId;
    return saved || 'gemini-2.5-flash';
  });
  const [showKeyModal, setShowKeyModal] = useState<boolean>(() => {
    // Show key modal automatically on first launch if no key is saved
    // (skipped in proxy mode: the key lives on the server)
    return !USE_PROXY && !localStorage.getItem('axiom_gemini_api_key');
  });

  // Files & Virtual Filesystem State
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [zipArchives, setZipArchives] = useState<ZipArchive[]>([]);
  const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);

  // Jury Evaluation & Batch Edits State
  const [latestEvaluation, setLatestEvaluation] = useState<JuryEvaluation | null>(null);
  const [pendingBatchEdits, setPendingBatchEdits] = useState<ProposedEdit[]>([]);
  const [showBatchApprovalModal, setShowBatchApprovalModal] = useState<boolean>(false);

  // Chat & Stream State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');

  // Mobile Navigation (Android View)
  const [mobileTab, setMobileTab] = useState<'chat' | 'files' | 'jury' | 'edits'>('chat');

  // Desktop active view tab
  const [desktopView, setDesktopView] = useState<'chat' | 'jury'>('chat');

  // ---- UI performance: batched streaming + always-fresh files ref ----
  // Streaming chunks are buffered and flushed every ~60ms, so the app does
  // not re-render dozens of times per second while text streams in.
  const streamBufferRef = useRef<string>('');
  const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushStreamBuffer = () => {
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }
    if (streamBufferRef.current) {
      setStreamingText((prev) => prev + streamBufferRef.current);
      streamBufferRef.current = '';
    }
  };

  const handleStreamChunk = (chunk: string) => {
    streamBufferRef.current += chunk;
    if (!streamFlushTimerRef.current) {
      streamFlushTimerRef.current = setTimeout(flushStreamBuffer, 60);
    }
  };

  const discardStreaming = () => {
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }
    streamBufferRef.current = '';
    setStreamingText('');
  };

  // Latest-files view for callbacks so memoized children never hold stale closures
  const virtualFilesRef = useRef<VirtualFile[]>(virtualFiles);
  useEffect(() => {
    virtualFilesRef.current = virtualFiles;
  }, [virtualFiles]);

  // ---- Native (Capacitor/Android) integration ----
  // Hardware back button: close the open modal first; exit the app only
  // when nothing is open. No-op inside a normal browser.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let handle: { remove: () => void } | null = null;
    import('@capacitor/app').then(({ App: CapApp }) => CapApp.addListener('backButton', () => {
      if (selectedFile) { setSelectedFile(null); return; }
      if (showBatchApprovalModal) { setShowBatchApprovalModal(false); return; }
      if (showKeyModal && apiKey.trim()) { setShowKeyModal(false); return; }
      CapApp.exitApp();
    })).then((h) => { if (disposed) h.remove(); else handle = h; }).catch(() => {});
    return () => { disposed = true; handle?.remove(); };
  }, [selectedFile, showBatchApprovalModal, showKeyModal, apiKey]);


  // Save API key & model
  const handleSaveKey = (newKey: string, newModel: SupportedModelId) => {
    setApiKey(newKey);
    setSelectedModel(newModel);
    localStorage.setItem('axiom_gemini_api_key', newKey);
    localStorage.setItem('axiom_gemini_model', newModel);
  };

  // Rename an archive / project (cascades to its files' version tags)
  const handleRenameArchive = (archiveId: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;
    setZipArchives((prev) =>
      prev.map((a) => (a.id === archiveId ? { ...a, name: cleanName, versionLabel: cleanName } : a))
    );
    setVirtualFiles((prev) =>
      prev.map((f) => (f.archiveId === archiveId ? { ...f, archiveName: cleanName, versionTag: cleanName } : f))
    );
  };

  // ZIP Upload handler
  const handleUploadZip = async (file: File) => {
    try {
      const { archive, files } = await unpackZipFile(file);
      setZipArchives((prev) => [...prev, archive]);
      setVirtualFiles((prev) => [...prev, ...files]);

      const noteMsg: ChatMessage = {
        id: `msg_zip_${Date.now()}`,
        role: 'system',
        content: `📦 آرشیو زیپ "${file.name}" با موفقیت آنزیپ شد. ${files.length} فایل جدید در ساختار درختی استخراج گردید.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, noteMsg]);
    } catch (err: any) {
      alert(`خطا در باز کردن فایل زیپ: ${err.message}`);
    }
  };

  // Single file upload handler
  const handleUploadSingleFile = async (file: File) => {
    try {
      const vFile = await parseSingleUploadedFile(file);
      setVirtualFiles((prev) => [...prev, vFile]);
    } catch (err: any) {
      alert(`خطا در بارگذاری فایل: ${err.message}`);
    }
  };

  // Load rich sample multi-version projects
  const handleLoadSampleProjects = () => {
    const combinedFiles = [...SAMPLE_PROJECT_V1_FILES, ...SAMPLE_PROJECT_V2_FILES];
    setZipArchives(SAMPLE_ARCHIVES);
    setVirtualFiles(combinedFiles);

    const welcomeMsg: ChatMessage = {
      id: `msg_sample_${Date.now()}`,
      role: 'assistant',
      content: `پروژه نمونه چندنسخه‌ای "حسگر مغناطیسی کوانتومی با پمپاژ نوری (OPM)" شامل دو نسخه (v1.0-Pilot و v2.1-Optimized) با کدهای زبان C میکروکنترلری، الگوریتم‌های پایتون و پیش‌نویس ادعاهای پتنت بارگذاری شد.\n\nاکنون می‌توانید با کلیک روی دکمه‌های بالای صفحه، داوری جامع را آغاز کنید یا درخواست مقایسه و سنتز این دو نسخه را صادر نمایید.`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, welcomeMsg]);
  };

  // Clear virtual workspace
  const handleClearFiles = () => {
    if (confirm('آیا از پاکسازی تمام فایل‌ها و آرشیوهای مخزن اطمینان دارید؟')) {
      setVirtualFiles([]);
      setZipArchives([]);
      setSelectedFile(null);
      setLatestEvaluation(null);
      setPendingBatchEdits([]);
    }
  };

  // Export entire modified virtual tree to ZIP (reads the latest files via
  // virtualFilesRef so memoized children never capture a stale closure)
  const handleExportZip = async () => {
    const currentFiles = virtualFilesRef.current;
    if (currentFiles.length === 0) return;
    try {
      const blob = await exportFilesToZip(currentFiles, 'axiom_refined_project.zip');
      triggerFileDownload(blob, 'axiom_refined_project.zip', 'application/zip');
    } catch (err: any) {
      alert(`خطا در ایجاد خروجی ZIP: ${err.message}`);
    }
  };

  // Direct manual save in file viewer
  const handleSaveFileContent = (fileId: string, newContent: string) => {
    setVirtualFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, content: newContent, isModified: true, lastModified: Date.now() }
          : f
      )
    );
    if (selectedFile && selectedFile.id === fileId) {
      setSelectedFile((prev) => (prev ? { ...prev, content: newContent, isModified: true } : null));
    }
  };

  // User official authorization to apply proposed batch edits
  const handleApproveBatchEdits = (approvedEdits: ProposedEdit[]) => {
    const { updatedFiles, appliedCount } = applyApprovedEdits(virtualFiles, approvedEdits);
    setVirtualFiles(updatedFiles);
    setPendingBatchEdits([]);

    const confirmMsg: ChatMessage = {
      id: `msg_patch_${Date.now()}`,
      role: 'assistant',
      content: `✅ مجوز رسمی شما دریافت شد: تعداد ${appliedCount} فایل با موفقیت در پروژه اصلاح و به‌روزرسانی گردید.\nتمامی فرمت‌بندی‌ها، توابع اصلی و یکپارچگی ساختار حفظ شدند. می‌توانید فایل‌های اصلاح شده را در درخت فایل مشاهده کرده یا کل پروژه را در قالب ZIP جدید دانلود کنید.`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, confirmMsg]);
  };

  // Send prompt or trigger preset
  const handleSendMessage = async (userPrompt: string) => {
    if (!USE_PROXY && !apiKey.trim()) {
      // If sample project is loaded and user clicks evaluation, provide demo evaluation
      if (virtualFiles.some(f => f.archiveId?.startsWith('arch_sample'))) {
        const userMsg: ChatMessage = {
          id: `usr_${Date.now()}`,
          role: 'user',
          content: userPrompt,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setStreamingText('در حال تحلیل پروژه نمونه با سناریوی هیئت داوران بین‌المللی...');

        setTimeout(() => {
          setIsLoading(false);
          setStreamingText('');
          setLatestEvaluation(SAMPLE_JURY_EVALUATION);
          setPendingBatchEdits(SAMPLE_JURY_EVALUATION.proposedEdits);

          const assistantMsg: ChatMessage = {
            id: `ast_${Date.now()}`,
            role: 'assistant',
            content: `${SAMPLE_JURY_EVALUATION.verdictSummaryFa}\n\nامتیاز نهایی داوری: ${SAMPLE_JURY_EVALUATION.overallScore}/100\nوضعیت حکم: ${SAMPLE_JURY_EVALUATION.verdictTitleFa}`,
            timestamp: Date.now(),
            evaluation: SAMPLE_JURY_EVALUATION,
            pendingEdits: SAMPLE_JURY_EVALUATION.proposedEdits,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setDesktopView('jury');
        }, 1000);
        return;
      }

      setShowKeyModal(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingText('');

    try {
      // Determine if this is a jury evaluation or multi-version synthesis command
      const isJuryIntent = 
        userPrompt.includes('داوری') || 
        userPrompt.includes('اعتبارسنجی') || 
        userPrompt.includes('ارزیابی') || 
        userPrompt.includes('مقایسه') || 
        userPrompt.includes('سنتز') ||
        userPrompt.includes('پتنت') ||
        userPrompt.includes('فیزیک');

      let constructedPrompt = userPrompt;
      if (isJuryIntent && virtualFiles.length > 0) {
        constructedPrompt = buildJuryPrompt(virtualFiles, userPrompt);
      }

      const fullResponse = await executeGeminiPrompt({
        apiKey,
        modelName: selectedModel,
        prompt: constructedPrompt,
        files: virtualFiles,
        useProxy: USE_PROXY,
        responseSchema: isJuryIntent && virtualFiles.length > 0 ? JURY_RESPONSE_SCHEMA : undefined,
        onStreamChunk: handleStreamChunk,
      });

      setStreamingText('');

      // Check if response contains a jury evaluation JSON
      if (fullResponse.includes('"overallScore"') || fullResponse.includes('verdict')) {
        const evaluation = parseJuryResponse(fullResponse);
        setLatestEvaluation(evaluation);
        if (evaluation.proposedEdits.length > 0) {
          setPendingBatchEdits(evaluation.proposedEdits);
        }

        const assistantMsg: ChatMessage = {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          content: `${evaluation.verdictSummaryFa}\n\nامتیاز نهایی داوری: ${evaluation.overallScore}/100\nوضعیت حکم: ${evaluation.verdictTitleFa}`,
          timestamp: Date.now(),
          evaluation,
          pendingEdits: evaluation.proposedEdits,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setDesktopView('jury');
      } else {
        const assistantMsg: ChatMessage = {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ بروز خطا در ارتباط با هوش مصنوعی: ${err.message || 'خطای ناشناخته'}. لطفاً از صحت کلید API یا سهمیه مدل در بخش تنظیمات اطمینان حاصل کنید.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      discardStreaming();
    }
  };

  // Specific file critique
  const handleRequestCritiqueForFile = (file: VirtualFile) => {
    setSelectedFile(null);
    handleSendMessage(
      `لطفاً فایل مشخص "${file.path}" را با موشکافی دقیق داوری کن، باگ‌های ساختاری یا علمی آن را بیان کرده و نسخه کاملاً اصلاح‌شده آن را پیشنهاد بده.`
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070E1B] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" dir="rtl">
      
      {/* Top Application Header */}
      <Header
        apiKey={apiKey}
        selectedModel={selectedModel}
        onOpenKeyModal={() => setShowKeyModal(true)}
        onExportZip={handleExportZip}
        filesCount={virtualFiles.length}
        archivesCount={zipArchives.length}
        onOpenEvaluation={() => {
          setDesktopView('jury');
          setMobileTab('jury');
        }}
        hasEvaluation={!!latestEvaluation}
      />

      {/* Main Multi-Column Workbench (Desktop + Responsive Android) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Desktop Main Content Area (Chat or Jury Evaluation) */}
        <main className={`flex-1 flex flex-col h-full overflow-hidden ${
          mobileTab !== 'chat' && mobileTab !== 'jury' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Desktop Sub-View Tabs */}
          <div className="hidden md:flex items-center justify-between px-5 py-2 bg-[#08101E] border-b border-slate-800 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDesktopView('chat')}
                className={`px-4 py-1.5 rounded-xl font-medium transition-colors ${
                  desktopView === 'chat'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                میزکار و چت تعاملی داوری
              </button>

              <button
                onClick={() => setDesktopView('jury')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-medium transition-colors ${
                  desktopView === 'jury'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>کارنامه داوری و تحلیل عمیق</span>
                {latestEvaluation && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                )}
              </button>
            </div>

            {pendingBatchEdits.length > 0 && (
              <button
                onClick={() => setShowBatchApprovalModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold transition-colors animate-pulse"
              >
                <span>{pendingBatchEdits.length} فایل اصلاحی در انتظار مجوز اعمال</span>
              </button>
            )}
          </div>

          {/* Active View: Chat or Jury */}
          <div className="flex-1 overflow-hidden">
            {(desktopView === 'jury' || mobileTab === 'jury') && latestEvaluation ? (
              <JuryEvaluationView
                evaluation={latestEvaluation}
                onOpenBatchEdits={(edits) => {
                  setPendingBatchEdits(edits);
                  setShowBatchApprovalModal(true);
                }}
                onSelectFileByPath={(path) => {
                  const target = virtualFiles.find(
                    (f) => f.path.toLowerCase() === path.toLowerCase() || f.name.toLowerCase() === path.toLowerCase()
                  );
                  if (target) setSelectedFile(target);
                }}
                onExportZip={handleExportZip}
              />
            ) : (
              <ChatAndWorkbench
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                streamingText={streamingText}
                files={virtualFiles}
                onTriggerPreset={handleSendMessage}
                onOpenEvaluation={() => {
                  setDesktopView('jury');
                  setMobileTab('jury');
                }}
                onOpenBatchEdits={(edits) => {
                  setPendingBatchEdits(edits);
                  setShowBatchApprovalModal(true);
                }}
                hasEvaluation={!!latestEvaluation}
                latestProposedEdits={pendingBatchEdits}
              />
            )}
          </div>
        </main>

        {/* Right Side: File & Directory Explorer Sidebar */}
        <aside className={`w-full md:w-80 lg:w-96 h-full shrink-0 ${
          mobileTab === 'files' ? 'flex' : 'hidden md:flex'
        }`}>
          <FileExplorer
            files={virtualFiles}
            archives={zipArchives}
            selectedFileId={selectedFile?.id || null}
            onSelectFile={(f) => setSelectedFile(f)}
            onUploadZip={handleUploadZip}
            onUploadSingleFile={handleUploadSingleFile}
            onRenameArchive={handleRenameArchive}
            onLoadSampleProjects={handleLoadSampleProjects}
            onExportZip={handleExportZip}
            onClearFiles={handleClearFiles}
          />
        </aside>

        {/* Mobile Batch Edits Tab */}
        {mobileTab === 'edits' && (
          <div className="md:hidden flex-1 flex flex-col p-4 bg-[#070E1B] overflow-y-auto">
            <h3 className="font-bold text-sm text-white mb-3">مجوز اصلاحات و بهینه‌سازی</h3>
            {pendingBatchEdits.length === 0 ? (
              <p className="text-xs text-slate-400">هیچ اصلاحیه‌ای در حال حاضر در انتظار مجوز نیست.</p>
            ) : (
              <button
                onClick={() => setShowBatchApprovalModal(true)}
                className="w-full py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                بررسی دیف و تایید {pendingBatchEdits.length} فایل
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Android layout) */}
      <MobileNav
        activeTab={mobileTab}
        onChangeTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'jury') setDesktopView('jury');
          if (tab === 'chat') setDesktopView('chat');
        }}
        filesCount={virtualFiles.length}
        hasEvaluation={!!latestEvaluation}
        pendingEditsCount={pendingBatchEdits.length}
      />

      {/* Modals */}
      <ApiKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        selectedModel={selectedModel}
        forceRequired={!apiKey}
      />

      <FileViewerModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onSaveContent={handleSaveFileContent}
        onRequestCritique={handleRequestCritiqueForFile}
      />

      <BatchEditApprovalModal
        isOpen={showBatchApprovalModal}
        onClose={() => setShowBatchApprovalModal(false)}
        proposedEdits={pendingBatchEdits}
        virtualFiles={virtualFiles}
        onApproveAndApply={handleApproveBatchEdits}
        onExportZipAfterApply={handleExportZip}
      />
    </div>
  );
}
