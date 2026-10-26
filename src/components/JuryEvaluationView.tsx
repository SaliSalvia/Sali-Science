/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Award, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Atom, 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Sparkles, 
  ChevronRight,
  GitMerge,
  FileCode,
  Download
} from 'lucide-react';
import { JuryEvaluation, ProposedEdit, WeaknessItem, VerdictStatus } from '../lib/types.ts';

interface JuryEvaluationViewProps {
  evaluation: JuryEvaluation;
  onOpenBatchEdits: (edits: ProposedEdit[]) => void;
  onSelectFileByPath?: (path: string) => void;
  onExportZip?: () => void;
}

export const JuryEvaluationView: React.FC<JuryEvaluationViewProps> = ({
  evaluation,
  onOpenBatchEdits,
  onSelectFileByPath,
  onExportZip,
}) => {
  const [activeTab, setActiveTab] = useState<'flaws' | 'physics' | 'patent' | 'code' | 'multiversion'>('flaws');

  const getVerdictBadge = (verdict: VerdictStatus) => {
    switch (verdict) {
      case 'ACCEPT_EXEMPLARY':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          title: 'تایید ممتاز (Exemplary - آماده ثبت اختراع / چاپ)',
          icon: <Award className="w-5 h-5 text-emerald-400" />,
        };
      case 'MINOR_REVISIONS':
        return {
          bg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
          title: 'اصلاحات جزئی (Minor Revisions - قابل حل سریع)',
          icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />,
        };
      case 'MAJOR_REVISIONS':
        return {
          bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          title: 'بازنگری عمده (Major Revisions - نیاز به تدقیق)',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      case 'CRITICAL_FLAWS':
        return {
          bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          title: 'دارای نقایص بنیادی تئوریک/فیزیکی (Critical Flaws)',
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
        };
    }
  };

  const verdictMeta = getVerdictBadge(evaluation.verdict);
  const aiSolvableCount = evaluation.weaknessesAndFlaws.filter(w => w.solvableByAI).length;
  const labRequiredCount = evaluation.weaknessesAndFlaws.filter(w => !w.solvableByAI).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#070E1B] text-slate-100 p-4 md:p-6 space-y-6">
      
      {/* Executive Scorecard Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1528] to-[#081220] border border-cyan-500/30 p-5 md:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${verdictMeta.bg}`}>
                {verdictMeta.icon}
                <span>{verdictMeta.title}</span>
              </span>
              <span className="text-xs text-slate-400">
                تاریخ داوری: {new Date(evaluation.timestamp).toLocaleTimeString('fa-IR')}
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
              {evaluation.verdictTitleFa}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {evaluation.verdictSummaryFa}
            </p>
          </div>

          {/* Overall Score Dial */}
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 shrink-0">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-cyan-500/40 bg-cyan-950/40 text-cyan-200 font-mono font-extrabold text-xl shadow-inner">
              {evaluation.overallScore}
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">امتیاز نهایی داوری</div>
              <div className="text-sm font-bold text-white">از ۱۰۰ امتیاز</div>
              <div className="text-[10px] text-cyan-400 mt-0.5">هیئت داوران بین‌المللی</div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Mini-Scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Atom className="w-3.5 h-3.5 text-cyan-400" />
                <span>اعتبار فیزیکی/ریاضی</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">{evaluation.physicsAndMathValidation.score}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${evaluation.physicsAndMathValidation.score}%` }} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
                <span>قابلیت ثبت اختراع</span>
              </span>
              <span className="font-mono font-bold text-blue-300">{evaluation.patentViability.score}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-400 h-full rounded-full" style={{ width: `${evaluation.patentViability.score}%` }} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>دقت مهندسی و کد</span>
              </span>
              <span className="font-mono font-bold text-emerald-300">{evaluation.codeAndEngineeringRigor.score}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${evaluation.codeAndEngineeringRigor.score}%` }} />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-yellow-400" />
                <span>نقایص قابل رفع هوش مصنوعی</span>
              </span>
              <span className="font-bold text-yellow-300"><span className="font-mono">{aiSolvableCount}</span> مورد</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {labRequiredCount > 0 ? `${labRequiredCount} مورد نیازمند آزمایشگاه` : 'تمام موارد نرم‌افزاری هستند'}
            </div>
          </div>
        </div>
      </div>

      {/* Action banner if proposed batch edits exist */}
      {evaluation.proposedEdits.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                اصلاحیه‌های پیشنهادی آماده اعمال ({evaluation.proposedEdits.length} فایل)
              </h4>
              <p className="text-xs text-slate-300">
                هوش مصنوعی کدهای بهینه‌شده و اصلاحات ادعاهای اختراع را آماده کرده است؛ برای اعمال رسمی نیاز به مجوز شما دارد.
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenBatchEdits(evaluation.proposedEdits)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>بررسی دیف و صدور مجوز اعمال</span>
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('flaws')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors font-medium shrink-0 ${
            activeTab === 'flaws'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>ماتریس نقایص و تضادها ({evaluation.weaknessesAndFlaws.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('patent')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors font-medium shrink-0 ${
            activeTab === 'patent'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-blue-400" />
          <span>داوری ثبت اختراع و ادعاها</span>
        </button>

        <button
          onClick={() => setActiveTab('physics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors font-medium shrink-0 ${
            activeTab === 'physics'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Atom className="w-4 h-4 text-cyan-400" />
          <span>اعتبارسنجی فیزیک و ترمودینامیک</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors font-medium shrink-0 ${
            activeTab === 'code'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>ممیزی الگوریتم و کد</span>
        </button>

        {evaluation.multiVersionComparison && (
          <button
            onClick={() => setActiveTab('multiversion')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors font-medium shrink-0 ${
              activeTab === 'multiversion'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <GitMerge className="w-4 h-4 text-purple-400" />
            <span>سنتز و مقایسه نسخه‌ها (برترین ورژن)</span>
          </button>
        )}
      </div>

      {/* Tab 1: Weaknesses & Flaws Matrix */}
      {activeTab === 'flaws' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>تفکیک بر اساس مرجع رفع (هوش مصنوعی در برابر آزمایشگاه فیزیکی):</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{aiSolvableCount} مورد توسط هوش مصنوعی قابل حل</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>{labRequiredCount} مورد نیازمند تست فیزیکی/لابراتواری</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {evaluation.weaknessesAndFlaws.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2.5 transition-all ${
                  item.severity === 'critical'
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : item.severity === 'high'
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.severity === 'critical'
                          ? 'bg-rose-900/80 text-rose-200 border border-rose-600'
                          : item.severity === 'high'
                          ? 'bg-amber-900/80 text-amber-200 border border-amber-600'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.severity === 'critical'
                        ? 'بحرانی'
                        : item.severity === 'high'
                        ? 'بالا'
                        : item.severity === 'medium'
                        ? 'متوسط'
                        : 'جزیی'}
                    </span>
                    <h4 className="font-bold text-sm text-white">{item.title}</h4>
                  </div>

                  {/* Capability Badge */}
                  <div>
                    {item.solvableByAI ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/90 border border-emerald-500/40 text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>قابل رفع توسط هوش مصنوعی</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/90 border border-rose-500/40 text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>نیازمند آزمایش فیزیکی/لابراتواری</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-300 text-xs">{item.description}</p>

                <div className="p-3 bg-[#08101E] rounded-lg border border-slate-800 flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-cyan-200">راهکار عملیاتی اصلاح: </span>
                    <span className="text-slate-300">{item.fixMethod}</span>
                  </div>
                </div>

                {item.targetFile && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      فایل هدف: <span className="font-mono text-cyan-300" dir="ltr">{item.targetFile}</span>
                    </span>
                    {onSelectFileByPath && (
                      <button
                        onClick={() => onSelectFileByPath(item.targetFile!)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                      >
                        <span>مشاهده فایل در ویرایشگر</span>
                        <ChevronRight className="w-3 h-3 rotate-180" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Patent & Prior Art */}
      {activeTab === 'patent' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#091426] border border-blue-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-400" />
                <span>وضعیت احراز پتنت بین‌المللی (WIPO / PCT / USPTO)</span>
              </h3>
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-blue-950 border border-blue-700 text-blue-200">
                امتیاز قابلیت پتنت: {evaluation.patentViability.score}/100
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#060D19] rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">میزان نوآوری (Novelty):</span>
                <span className="text-slate-200 font-medium">{evaluation.patentViability.noveltyStatus}</span>
              </div>
              <div className="p-3 bg-[#060D19] rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">استحکام ادعاها (Claim Strength):</span>
                <span className="text-slate-200 font-medium">{evaluation.patentViability.claimStrength}</span>
              </div>
            </div>

            {evaluation.patentViability.priorArtRisks.length > 0 && (
              <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30 space-y-1.5 text-xs">
                <span className="font-bold text-amber-300 block">ریسک‌های هنر قبلی (Prior Art Risks):</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {evaluation.patentViability.priorArtRisks.map((risk, i) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.patentViability.recommendedPatentClaims.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-xs text-cyan-300 block">ادعاهای تدوین شده پیشنهادی (Patent Claims):</span>
                <div className="space-y-2">
                  {evaluation.patentViability.recommendedPatentClaims.map((claim, i) => (
                    <div key={i} className="p-3 bg-[#070E1B] rounded-xl border border-slate-800 text-xs leading-relaxed font-mono text-cyan-100">
                      {claim}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Physics & Thermodynamics */}
      {activeTab === 'physics' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#091426] border border-cyan-500/30 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Atom className="w-4 h-4 text-cyan-400" />
              <span>ارزیابی اصول موضوعه فیزیک و بقای ماده و انرژی</span>
            </h3>

            <div className="p-3 bg-[#060D19] rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">سازگاری تئوریک:</span>
              <p className="text-slate-200 leading-relaxed">{evaluation.physicsAndMathValidation.theoreticalConsistency}</p>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-400 block">قوانین و قضایای بررسی شده:</span>
              <div className="flex flex-wrap gap-2">
                {evaluation.physicsAndMathValidation.lawsChecked.map((law, i) => (
                  <span key={i} className="px-2.5 py-1 bg-cyan-950/70 border border-cyan-500/30 text-cyan-200 rounded-lg text-xs">
                    ✓ {law}
                  </span>
                ))}
              </div>
            </div>

            {evaluation.physicsAndMathValidation.flawsIdentified.length > 0 && (
              <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-500/30 space-y-1.5 text-xs">
                <span className="font-bold text-rose-300 block">نقایص تئوریک مشخص‌شده:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {evaluation.physicsAndMathValidation.flawsIdentified.map((flaw, i) => (
                    <li key={i}>{flaw}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Code & Algorithmic Rigor */}
      {activeTab === 'code' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#091426] border border-emerald-500/30 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>ممیزی الگوریتم، پیچیدگی محاسباتی و ایمنی حافظه</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#060D19] rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold">پیچیدگی الگوریتمی (Big-O):</span>
                <p className="text-slate-200">{evaluation.codeAndEngineeringRigor.algorithmicComplexity}</p>
              </div>

              <div className="p-3 bg-[#060D19] rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold">ایمنی حافظه و پوینترها (C/C++):</span>
                <p className="text-slate-200">{evaluation.codeAndEngineeringRigor.memoryAndConcurrencySafety}</p>
              </div>
            </div>

            <div className="p-3 bg-[#060D19] rounded-xl border border-slate-800 space-y-1 text-xs">
              <span className="text-slate-400 font-semibold">معماری سیستم و پایداری:</span>
              <p className="text-slate-200 leading-relaxed">{evaluation.codeAndEngineeringRigor.architecturalSoundness}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Multi-Version Comparison & Synthesis */}
      {activeTab === 'multiversion' && evaluation.multiVersionComparison && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0C142A] to-[#08101E] border border-purple-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-purple-400" />
                <span>ماتریس مقایسه چند نسخه و سنتز بهینه (Hybrid Master Synthesis)</span>
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950 border border-purple-500 text-purple-200">
                برترین نسخه انتخاب شده: {evaluation.multiVersionComparison.bestVersionId}
              </span>
            </div>

            <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/30 text-xs text-purple-200">
              <span className="font-bold text-white">استدلال انتخاب بهترین نسخه: </span>
              <span>{evaluation.multiVersionComparison.bestVersionRationale}</span>
            </div>

            {/* Rankings Table / Cards */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">رتبه‌بندی نسخه‌های ارائه شده:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evaluation.multiVersionComparison.rankings.map((r) => (
                  <div key={r.versionId} className="p-3 rounded-xl bg-[#070E1B] border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-cyan-300">
                          #{r.rank}
                        </span>
                        <span className="font-bold text-white">{r.versionName}</span>
                      </div>
                      <span className="font-mono text-cyan-400 font-bold">{r.score}/100</span>
                    </div>
                    <div className="text-[11px] space-y-1">
                      <div className="text-emerald-400">نقاط قوت: {r.pros.join('، ')}</div>
                      <div className="text-rose-400">نقاط ضعف: {r.cons.join('، ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hybrid Synthesis Recipe */}
            <div className="p-4 bg-[#08101E] rounded-xl border border-slate-800 space-y-2 text-xs leading-relaxed">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>دستورالعمل ترکیب برتر (Hybrid Recipe):</span>
              </span>
              <p className="text-slate-300 whitespace-pre-line">
                {evaluation.multiVersionComparison.hybridSynthesisRecipe}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
