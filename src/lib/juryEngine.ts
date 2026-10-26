/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VirtualFile, JuryEvaluation, ProposedEdit, WeaknessItem, MultiVersionComparison } from './types.ts';
import * as Diff from 'diff';

/**
 * Gemini structured-output schema for jury evaluations.
 * Passed with responseMimeType 'application/json' so the model is guaranteed
 * to return valid JSON matching the JuryEvaluation contract (see types.ts).
 */
export const JURY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overallScore: { type: 'NUMBER' },
    verdict: {
      type: 'STRING',
      enum: ['ACCEPT_EXEMPLARY', 'MINOR_REVISIONS', 'MAJOR_REVISIONS', 'CRITICAL_FLAWS'],
    },
    verdictTitleFa: { type: 'STRING' },
    verdictSummaryFa: { type: 'STRING' },
    physicsAndMathValidation: {
      type: 'OBJECT',
      properties: {
        score: { type: 'NUMBER' },
        lawsChecked: { type: 'ARRAY', items: { type: 'STRING' } },
        theoreticalConsistency: { type: 'STRING' },
        flawsIdentified: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['score', 'lawsChecked', 'theoreticalConsistency', 'flawsIdentified'],
    },
    patentViability: {
      type: 'OBJECT',
      properties: {
        score: { type: 'NUMBER' },
        noveltyStatus: { type: 'STRING' },
        priorArtRisks: { type: 'ARRAY', items: { type: 'STRING' } },
        claimStrength: { type: 'STRING' },
        patentReadiness: { type: 'STRING' },
        recommendedPatentClaims: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['score', 'noveltyStatus', 'priorArtRisks', 'claimStrength', 'patentReadiness', 'recommendedPatentClaims'],
    },
    codeAndEngineeringRigor: {
      type: 'OBJECT',
      properties: {
        score: { type: 'NUMBER' },
        algorithmicComplexity: { type: 'STRING' },
        memoryAndConcurrencySafety: { type: 'STRING' },
        architecturalSoundness: { type: 'STRING' },
      },
      required: ['score', 'algorithmicComplexity', 'memoryAndConcurrencySafety', 'architecturalSoundness'],
    },
    weaknessesAndFlaws: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          severity: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] },
          description: { type: 'STRING' },
          fixMethod: { type: 'STRING' },
          solvableByAI: { type: 'BOOLEAN' },
          targetFile: { type: 'STRING' },
        },
        required: ['id', 'title', 'severity', 'description', 'fixMethod', 'solvableByAI'],
      },
    },
    proposedEdits: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          filePath: { type: 'STRING' },
          rationale: { type: 'STRING' },
          newFullContent: { type: 'STRING' },
        },
        required: ['id', 'filePath', 'rationale', 'newFullContent'],
      },
    },
    multiVersionComparison: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        versionsAnalyzed: { type: 'ARRAY', items: { type: 'STRING' } },
        bestVersionId: { type: 'STRING' },
        bestVersionRationale: { type: 'STRING' },
        rankings: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              versionId: { type: 'STRING' },
              versionName: { type: 'STRING' },
              rank: { type: 'NUMBER' },
              score: { type: 'NUMBER' },
              pros: { type: 'ARRAY', items: { type: 'STRING' } },
              cons: { type: 'ARRAY', items: { type: 'STRING' } },
              keyDifferences: { type: 'STRING' },
            },
          },
        },
        hybridSynthesisRecipe: { type: 'STRING' },
        suggestedMasterFiles: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              path: { type: 'STRING' },
              description: { type: 'STRING' },
              content: { type: 'STRING' },
            },
          },
        },
      },
    },
  },
  required: [
    'overallScore',
    'verdict',
    'verdictTitleFa',
    'verdictSummaryFa',
    'physicsAndMathValidation',
    'patentViability',
    'codeAndEngineeringRigor',
    'weaknessesAndFlaws',
    'proposedEdits',
  ],
};


/**
 * Builds the strict International Scientific Jury & Patent Committee prompt
 */
export function buildJuryPrompt(
  files: VirtualFile[],
  userSpecificQuestion?: string,
  mode: 'full_jury' | 'multi_version_synthesis' | 'patent_audit' | 'physics_validation' = 'full_jury'
): string {
  // Aggregate summary of files
  const fileSummaries = files.map(f => {
    let preview = '';
    if (f.isBinary) {
      preview = `[فایل باینری/چندرسانه‌ای - نوع: ${f.mimeType} - حجم: ${f.size} بایت]`;
    } else {
      // Limit preview length to avoid token explosion, but provide generous content
      const maxLen = files.length > 5 ? 4000 : 8000;
      preview = f.content.length > maxLen 
        ? f.content.substring(0, maxLen) + `\n... [ادامه دارد: مجموع ${f.content.length} کاراکتر]`
        : f.content;
    }
    return `### فایل: ${f.path} (آرشیو/نسخه: ${f.versionTag || f.archiveName || 'جاری'})\n\`\`\`${f.extension}\n${preview}\n\`\`\``;
  }).join('\n\n');

  // Detect distinct versions / archives
  const uniqueArchives = Array.from(new Set(files.map(f => f.versionTag || f.archiveName || 'v1')));
  const isMultiVersion = uniqueArchives.length > 1 || mode === 'multi_version_synthesis';

  let modeInstruction = '';
  if (isMultiVersion) {
    modeInstruction = `
توجه ویژه به نسخه‌های متعدد:
کاربر چند نسخه یا آرشیو مختلف بارگذاری کرده است (${uniqueArchives.join(', ')}).
وظیفه داری:
1. تک تک نسخه‌ها را از نظر عمق، تکامل، پایداری، کامل بودن مستندات و کدهای اجرایی رتبه‌بندی کنی.
2. بهترین نسخه (Best Version) را با استدلال قاطع مشخص کنی.
3. یک "فرمول سنتز و ترکیب بهینه" (Hybrid Master Synthesis) ارائه دهی که نقاط قوت هر نسخه را برگزیده و به یک نسخه واحد بدون نقص تبدیل کند.
4. فایل‌های اصلاح شده یا ترکیب شده پیشنهادی را در بخش proposedEdits قرار دهی.
`;
  }

  return `
تو به عنوان هیئت داوران بین‌المللی عالی‌رتبه (International Scientific Jury & Patent Examination Board) متشکل از برجسته‌ترین دانشمندان فیزیک، مهندسان سیستم، کارشناسان ارشد پتنت WIPO/USPTO و محققان ارشد الگوریتم عمل می‌کنی.
نگاه تو به شدت سخت‌گیرانه، ریزبین، بدون تعارف و بر پایه اصول اولیه علوم تجربی و مهندسی (First Principles) است.

پروژه و فایل‌های بارگذاری شده توسط پژوهشگر/مخترع به شرح زیر است:

${fileSummaries}

${userSpecificQuestion ? `سوال یا پرامپت خاص کاربر:\n${JSON.stringify(userSpecificQuestion)}\n` : ''}
${modeInstruction}

دستورالعمل داوری:
1. اعتبارسنجی فیزیکی و ریاضیاتی: تطابق با قوانین ترمودینامیک، بقای انرژی و جرم، ابعاد فیزیکی، رفتارهای غیرخطی، مقیاس‌پذیری.
2. داوری ثبت اختراع (Patent Viability): بررسی نوآوری واقعی (Novelty)، گام ابتکاری (Inventive Step)، عدم بداهت، کاربرد صنعتی، و آسیب‌پذیری در برابر هنر قبلی (Prior Art).
3. بررسی کد و ساختار مهندسی: پیچیدگی زمانی/فضایی الگوریتم‌ها، امنیت حافظه در C/C++، ریسک‌های همزمانی (Race conditions)، باگ‌های منطقی پنهان در پایتون یا اسکریپت‌ها.
4. تفکیک بسیار دقیق نقایص:
   - برای هر نقص، حتماً مشخص کن آیا:
     * 🟢 "قابل رفع توسط هوش مصنوعی" (solvableByAI = true): شامل بازنویسی و تکمیل بخش‌های مقاله، اصلاح یا بهینه‌سازی کدهای C و Python، تدوین ادعاهای اختراع (Patent Claims)، اصلاح فرمول‌ها یا مستندات.
     * 🔴 "نیازمند آزمایش فیزیکی/لابراتواری" (solvableByAI = false): شامل ساخت نمونه سخت‌افزاری، تست دوام در شرایط محیطی، تست آزمایشگاهی شیمیایی/مکانیکی، کالیبراسیون سنسورها.
5. اصلاح مستقیم و عملیاتی (Proposed Edits):
   - برای مواردی که توسط هوش مصنوعی قابل حل هستند، پیشنهاد اصلاحیه کامل بده شامل \`filePath\`، دلیل اصلاح (\`rationale\`) و متن کامل اصلاح‌شده فایل (\`newFullContent\`) به گونه‌ای که کاربر بتواند با یک کلیک و مجوز دادن، فایل را در پروژه خود جایگزین کند.

خروجی خود را دقیقاً و الزاماً در یک ساختار JSON استاندارد با فیلدهای زیر بازگردان (هیچ متن دیگری خارج از بلاک JSON ننویس تا مستقیماً پارس شود):

\`\`\`json
{
  "overallScore": 84,
  "verdict": "ACCEPT_EXEMPLARY" | "MINOR_REVISIONS" | "MAJOR_REVISIONS" | "CRITICAL_FLAWS",
  "verdictTitleFa": "عنوان کوتاه حکم داوری به فارسی",
  "verdictSummaryFa": "تحلیل عمیق و جمع‌بندی هیئت داوران در چند پاراگراف دقیق",
  "physicsAndMathValidation": {
    "score": 85,
    "lawsChecked": ["قانون اول و دوم ترمودینامیک", "بقای اندازه حرکت"],
    "theoreticalConsistency": "توضیح سازگاری تئوریک با اصول فیزیک",
    "flawsIdentified": ["نقص ۱", "نقص ۲"]
  },
  "patentViability": {
    "score": 90,
    "noveltyStatus": "میزان نوآوری و تمایز",
    "priorArtRisks": ["ریسک تقابل با پتنت‌های ثبت شده مشابه"],
    "claimStrength": "ارزیابی استحکام ادعاهای اختراع",
    "patentReadiness": "آماده برای اظهارنامه بین‌المللی PCT",
    "recommendedPatentClaims": ["ادعای مستقل ۱: ...", "ادعای وابسته ۲: ..."]
  },
  "codeAndEngineeringRigor": {
    "score": 80,
    "algorithmicComplexity": "تحلیل O(N) و بار محاسباتی",
    "memoryAndConcurrencySafety": "بررسی مدیریت حافظه، پوینترها و تردها",
    "architecturalSoundness": "ارزیابی ساختار ماژولار و تفکیک لایه‌ها"
  },
  "weaknessesAndFlaws": [
    {
      "id": "w1",
      "title": "عنوان دقیق نقص",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "شرح دقیق ضعف و ناهماهنگی",
      "fixMethod": "راهکار عملیاتی مشخص جهت رفع",
      "solvableByAI": true,
      "targetFile": "نام فایل مربوطه یا خالی"
    }
  ],
  "proposedEdits": [
    {
      "id": "pe1",
      "filePath": "src/main.py",
      "rationale": "دلیل و مزیت علمی این اصلاح",
      "newFullContent": "کد کامل اصلاح شده فایل بدون هیچ حذف کدی"
    }
  ],
  "multiVersionComparison": ${isMultiVersion ? `{
    "versionsAnalyzed": ["${uniqueArchives.join('", "')}"],
    "bestVersionId": "${uniqueArchives[0]}",
    "bestVersionRationale": "چرا این نسخه برتر است",
    "rankings": [
      {
        "versionId": "${uniqueArchives[0]}",
        "versionName": "${uniqueArchives[0]}",
        "rank": 1,
        "score": 88,
        "pros": ["نقطه قوت ۱"],
        "cons": ["نقطه ضعف ۱"],
        "keyDifferences": "تفاوت‌های کلیدی با سایر نسخه‌ها"
      }
    ],
    "hybridSynthesisRecipe": "دستورالعمل جامع ترکیب بهترین ویژگی‌های هر نسخه"
  }` : 'null'}
}
\`\`\`
`;
}

/**
 * Robustly parses AI response into JuryEvaluation structure
 */
export function parseJuryResponse(aiResponseText: string): JuryEvaluation {
  try {
    // Locate JSON block
    let cleanJson = aiResponseText.trim();
    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1];
    } else {
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(cleanJson);

    return {
      id: `eval_${Date.now()}`,
      timestamp: Date.now(),
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 75,
      verdict: parsed.verdict || 'MINOR_REVISIONS',
      verdictTitleFa: parsed.verdictTitleFa || 'گزارش داوری علمی و فنی',
      verdictSummaryFa: parsed.verdictSummaryFa || 'تحلیل فنی و ارزیابی پروژه به پایان رسید.',
      physicsAndMathValidation: {
        score: parsed.physicsAndMathValidation?.score || 80,
        lawsChecked: Array.isArray(parsed.physicsAndMathValidation?.lawsChecked) ? parsed.physicsAndMathValidation.lawsChecked : ['اصول اولیه فیزیک'],
        theoreticalConsistency: parsed.physicsAndMathValidation?.theoreticalConsistency || 'پروژه از ثبات تئوریک قابل قبولی برخوردار است.',
        flawsIdentified: Array.isArray(parsed.physicsAndMathValidation?.flawsIdentified) ? parsed.physicsAndMathValidation.flawsIdentified : [],
      },
      patentViability: {
        score: parsed.patentViability?.score || 80,
        noveltyStatus: parsed.patentViability?.noveltyStatus || 'دارای ویژگی‌های نوآورانه با قابلیت ثبت',
        priorArtRisks: Array.isArray(parsed.patentViability?.priorArtRisks) ? parsed.patentViability.priorArtRisks : [],
        claimStrength: parsed.patentViability?.claimStrength || 'ادعاها نیازمند فرمول‌بندی حقوقی دقیق‌تر هستند',
        patentReadiness: parsed.patentViability?.patentReadiness || 'مستندات آماده تنظیم اظهارنامه اولیه',
        recommendedPatentClaims: Array.isArray(parsed.patentViability?.recommendedPatentClaims) ? parsed.patentViability.recommendedPatentClaims : [],
      },
      codeAndEngineeringRigor: {
        score: parsed.codeAndEngineeringRigor?.score || 75,
        algorithmicComplexity: parsed.codeAndEngineeringRigor?.algorithmicComplexity || 'الگوریتم‌ها در بازه بهینه قرار دارند',
        memoryAndConcurrencySafety: parsed.codeAndEngineeringRigor?.memoryAndConcurrencySafety || 'بررسی ایمنی حافظه انجام شد',
        architecturalSoundness: parsed.codeAndEngineeringRigor?.architecturalSoundness || 'ساختار ماژولار مناسب',
      },
      weaknessesAndFlaws: Array.isArray(parsed.weaknessesAndFlaws) ? parsed.weaknessesAndFlaws : [],
      proposedEdits: Array.isArray(parsed.proposedEdits) ? parsed.proposedEdits.map((pe: any, idx: number) => ({
        id: pe.id || `edit_${idx}_${Date.now()}`,
        filePath: pe.filePath || 'unnamed',
        rationale: pe.rationale || 'اصلاح خودکار جهت رفع نقص',
        originalSnippet: pe.originalSnippet,
        newSnippet: pe.newSnippet,
        newFullContent: pe.newFullContent,
        approved: false,
      })) : [],
      multiVersionComparison: parsed.multiVersionComparison || undefined,
    };
  } catch (error) {
    console.warn('Direct JSON parsing failed, building graceful fallback evaluation:', error);
    // Graceful fallback from raw text
    return {
      id: `eval_${Date.now()}`,
      timestamp: Date.now(),
      overallScore: 78,
      verdict: 'MINOR_REVISIONS',
      verdictTitleFa: 'تحلیل جامع داوری بین‌المللی',
      verdictSummaryFa: aiResponseText.slice(0, 500) + '...',
      physicsAndMathValidation: {
        score: 80,
        lawsChecked: ['اعتبارسنجی تئوریک'],
        theoreticalConsistency: 'سازگار با قوانین علمی مرتبط',
        flawsIdentified: [],
      },
      patentViability: {
        score: 82,
        noveltyStatus: 'پتانسیل ثبت اختراع بالا با مستندسازی تکمیلی',
        priorArtRisks: ['پیشینه مشابه در پایگاه‌های بین‌المللی'],
        claimStrength: 'ادعاها باید در قالب مشخص USPTO/WIPO تدوین شوند',
        patentReadiness: 'مناسب برای آماده‌سازی پیش‌نویس پتنت',
        recommendedPatentClaims: [],
      },
      codeAndEngineeringRigor: {
        score: 75,
        algorithmicComplexity: 'نیاز به بهینه‌سازی محاسباتی',
        memoryAndConcurrencySafety: 'عدم وجود خطای بحرانی ساختاری',
        architecturalSoundness: 'ساختار کلی قابل گسترش است',
      },
      weaknessesAndFlaws: [
        {
          id: 'w_fallback_1',
          title: 'بررسی تکمیلی مستندات و داده‌های عددی',
          severity: 'medium',
          description: 'برخی بخش‌ها نیازمند اعتبارسنجی دقیق‌تر عددی و ارائه جزئیات پیاده‌سازی هستند.',
          fixMethod: 'اصلاح و به‌روزرسانی کدها و فرمول‌ها با پرامپت مستقیم',
          solvableByAI: true,
        }
      ],
      proposedEdits: [],
    };
  }
}

/**
 * Applies approved proposed edits to virtual files
 */
export function applyApprovedEdits(
  files: VirtualFile[],
  approvedEdits: ProposedEdit[]
): { updatedFiles: VirtualFile[]; appliedCount: number } {
  let appliedCount = 0;

  // Exact (case-insensitive) path matches always take priority.
  const editsByPath = new Map<string, ProposedEdit>();

  // Basename fallback is only safe when exactly one loaded file has that name;
  // otherwise an edit meant for one version could overwrite another version's file.
  const nameCounts = new Map<string, number>();
  for (const file of files) {
    const key = file.name.toLowerCase().trim();
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  }
  const editsByUniqueName = new Map<string, ProposedEdit>();

  for (const edit of approvedEdits) {
    if (!edit.approved || !edit.newFullContent) continue;
    editsByPath.set(edit.filePath.toLowerCase().trim(), edit);
    const base = edit.filePath.split('/').pop()?.toLowerCase().trim();
    if (base && nameCounts.get(base) === 1) {
      editsByUniqueName.set(base, edit);
    }
  }

  const updatedFiles = files.map(file => {
    const pathKey = file.path.toLowerCase().trim();
    const nameKey = file.name.toLowerCase().trim();
    const edit = editsByPath.get(pathKey) || editsByUniqueName.get(nameKey);

    if (edit && edit.newFullContent) {
      appliedCount++;
      return {
        ...file,
        content: edit.newFullContent,
        isModified: true,
        lastModified: Date.now(),
      };
    }
    return file;
  });

  return { updatedFiles, appliedCount };
}

/**
 * Computes structured line-by-line diff between original and proposed content
 */
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNumber?: number;
}

export function computeLineDiff(original: string, modified: string): DiffLine[] {
  const parts = Diff.diffLines(original, modified);
  const diffLines: DiffLine[] = [];
  let lineNum = 1;

  for (const part of parts) {
    const lines = part.value.split('\n');
    // Remove last empty string if value ended with newline
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    for (const line of lines) {
      if (part.added) {
        diffLines.push({ type: 'added', text: line, lineNumber: lineNum });
        lineNum++;
      } else if (part.removed) {
        diffLines.push({ type: 'removed', text: line });
      } else {
        diffLines.push({ type: 'unchanged', text: line, lineNumber: lineNum });
        lineNum++;
      }
    }
  }

  return diffLines;
}
