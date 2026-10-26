/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VirtualFile {
  id: string;
  path: string; // e.g. "src/algorithm.py" or "v1/paper.md"
  name: string;
  extension: string;
  size: number;
  content: string; // text content or base64 data url for binary
  isBinary: boolean;
  mimeType: string;
  isModified?: boolean;
  originalContent?: string;
  archiveId?: string; // id of parent ZIP
  archiveName?: string;
  versionTag?: string; // e.g. "v1", "v2-final", "Release"
  lastModified?: number;
}

export interface ZipArchive {
  id: string;
  name: string;
  size: number;
  extractedAt: number;
  fileCount: number;
  versionLabel: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileTreeNode[];
  fileId?: string;
  isModified?: boolean;
  archiveId?: string;
}

export type VerdictStatus = 
  | 'ACCEPT_EXEMPLARY' // تایید ممتاز و آماده ثبت اختراع / چاپ بین‌المللی
  | 'MINOR_REVISIONS'  // نیازمند اصلاحات جزیی
  | 'MAJOR_REVISIONS'  // نیازمند بازنگری ساختاری عمده
  | 'CRITICAL_FLAWS';  // دارای تضادهای بنیادین علمی/فیزیکی

export type WeaknessSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface WeaknessItem {
  id: string;
  title: string;
  severity: WeaknessSeverity;
  description: string;
  fixMethod: string;
  solvableByAI: boolean; // true = 🟢 هوش مصنوعی مستقیماً اصلاح می‌کند, false = 🔴 نیازمند آزمایش فیزیکی/لابراتواری
  targetFile?: string;
}

export interface ProposedEdit {
  id: string;
  filePath: string;
  rationale: string;
  originalSnippet?: string;
  newSnippet?: string;
  newFullContent?: string;
  approved?: boolean;
}

export interface MultiVersionRanking {
  versionId: string;
  versionName: string;
  rank: number;
  score: number;
  pros: string[];
  cons: string[];
  keyDifferences: string;
}

export interface MultiVersionComparison {
  versionsAnalyzed: string[];
  bestVersionId: string;
  bestVersionRationale: string;
  rankings: MultiVersionRanking[];
  hybridSynthesisRecipe: string; // دستورالعمل ترکیب بهینه بخش‌های برتر هر نسخه
  suggestedMasterFiles?: Array<{
    path: string;
    description: string;
    content: string;
  }>;
}

export interface JuryEvaluation {
  id: string;
  timestamp: number;
  overallScore: number; // 0-100
  verdict: VerdictStatus;
  verdictTitleFa: string;
  verdictSummaryFa: string;
  physicsAndMathValidation: {
    score: number;
    lawsChecked: string[];
    theoreticalConsistency: string;
    flawsIdentified: string[];
  };
  patentViability: {
    score: number;
    noveltyStatus: string;
    priorArtRisks: string[];
    claimStrength: string;
    patentReadiness: string;
    recommendedPatentClaims: string[];
  };
  codeAndEngineeringRigor: {
    score: number;
    algorithmicComplexity: string;
    memoryAndConcurrencySafety: string;
    architecturalSoundness: string;
  };
  weaknessesAndFlaws: WeaknessItem[];
  proposedEdits: ProposedEdit[];
  multiVersionComparison?: MultiVersionComparison;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  evaluation?: JuryEvaluation;
  pendingEdits?: ProposedEdit[];
  referencedFiles?: string[];
}

export interface APIConfig {
  apiKey: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
  status: 'idle' | 'valid' | 'invalid' | 'checking';
  errorMessage?: string;
}
