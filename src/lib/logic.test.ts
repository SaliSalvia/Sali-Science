/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  buildFileTree, 
  getFileExtension, 
  isTextFile, 
  isDocxFile, 
  formatFileSize 
} from './fileSystem.ts';
import { 
  parseJuryResponse, 
  applyApprovedEdits, 
  computeLineDiff 
} from './juryEngine.ts';
import { VirtualFile, ProposedEdit } from './types.ts';

test('file extension extraction and text detection', () => {
  assert.equal(getFileExtension('project/test.py'), 'py');
  assert.equal(getFileExtension('archive.tar.gz'), 'gz');
  assert.equal(getFileExtension('noextension'), '');
  assert.equal(isTextFile('main.c'), true);
  assert.equal(isTextFile('paper.md'), true);
  assert.equal(isTextFile('script.py'), true);
  assert.equal(isDocxFile('patent_draft.docx'), true);
  assert.equal(isDocxFile('image.png'), false);
});

test('file size formatting handles boundaries gracefully', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(1048576), '1 MB');
});

test('buildFileTree constructs nested directory hierarchy', () => {
  const files: VirtualFile[] = [
    {
      id: 'f1',
      path: 'src/core/engine.c',
      name: 'engine.c',
      extension: 'c',
      size: 500,
      content: 'int main() { return 0; }',
      isBinary: false,
      mimeType: 'text/x-c',
    },
    {
      id: 'f2',
      path: 'src/utils.py',
      name: 'utils.py',
      extension: 'py',
      size: 200,
      content: 'def run(): pass',
      isBinary: false,
      mimeType: 'text/x-python',
    },
    {
      id: 'f3',
      path: 'README.md',
      name: 'README.md',
      extension: 'md',
      size: 150,
      content: '# Project',
      isBinary: false,
      mimeType: 'text/markdown',
    }
  ];

  const tree = buildFileTree(files);
  assert.equal(tree.length, 2); // 'src' directory and 'README.md'
  const srcDir = tree.find(n => n.name === 'src');
  assert.ok(srcDir);
  assert.equal(srcDir.isDirectory, true);
  assert.ok(srcDir.children && srcDir.children.length === 2);
});

test('parseJuryResponse parses valid JSON markdown block', () => {
  const sampleJson = `
\`\`\`json
{
  "overallScore": 92,
  "verdict": "ACCEPT_EXEMPLARY",
  "verdictTitleFa": "تایید اختراع با تمایز بالا",
  "verdictSummaryFa": "طرح ارائه شده از استحکام تئوریک بسیار بالایی برخوردار است.",
  "physicsAndMathValidation": {
    "score": 95,
    "lawsChecked": ["بقای تکانه", "قانون اول ترمودینامیک"],
    "theoreticalConsistency": "کاملاً منطبق بر قوانین پایه فیزیک",
    "flawsIdentified": []
  },
  "patentViability": {
    "score": 90,
    "noveltyStatus": "تازگی نوآورانه بالا",
    "priorArtRisks": [],
    "claimStrength": "ادعاهای فنی مستقل و دقیق",
    "patentReadiness": "آماده برای ثبت پتنت WIPO",
    "recommendedPatentClaims": ["ادعای ۱: سیستم پردازش نوین"]
  },
  "codeAndEngineeringRigor": {
    "score": 88,
    "algorithmicComplexity": "O(N log N)",
    "memoryAndConcurrencySafety": "ایمن در برابر Race Condition",
    "architecturalSoundness": "طراحی ماژولار و تفکیک شده"
  },
  "weaknessesAndFlaws": [
    {
      "id": "w1",
      "title": "عدم مدیریت سرریز عدد صحیح در حلقه اصلی",
      "severity": "medium",
      "description": "در ماژول اصلی متغیر شمارنده ممکن است سرریز شود",
      "fixMethod": "استفاده از int64_t به جای uint32_t",
      "solvableByAI": true,
      "targetFile": "src/core/engine.c"
    }
  ],
  "proposedEdits": [
    {
      "id": "e1",
      "filePath": "src/core/engine.c",
      "rationale": "اصلاح تایپ شمارنده جهت جلوگیری از سرریز",
      "newFullContent": "#include <stdint.h>\\nint main() { int64_t counter = 0; return 0; }"
    }
  ]
}
\`\`\`
  `;

  const evaluation = parseJuryResponse(sampleJson);
  assert.equal(evaluation.overallScore, 92);
  assert.equal(evaluation.verdict, 'ACCEPT_EXEMPLARY');
  assert.equal(evaluation.weaknessesAndFlaws.length, 1);
  assert.equal(evaluation.weaknessesAndFlaws[0].solvableByAI, true);
  assert.equal(evaluation.proposedEdits.length, 1);
});

test('applyApprovedEdits updates only approved edits', () => {
  const originalFiles: VirtualFile[] = [
    {
      id: 'f1',
      path: 'src/main.py',
      name: 'main.py',
      extension: 'py',
      size: 50,
      content: 'print("v1")',
      isBinary: false,
      mimeType: 'text/x-python',
    },
    {
      id: 'f2',
      path: 'src/helper.py',
      name: 'helper.py',
      extension: 'py',
      size: 50,
      content: 'x = 1',
      isBinary: false,
      mimeType: 'text/x-python',
    }
  ];

  const edits: ProposedEdit[] = [
    {
      id: 'e1',
      filePath: 'src/main.py',
      rationale: 'بروزرسانی نسخه',
      newFullContent: 'print("v2 - refined")',
      approved: true, // APPROVED
    },
    {
      id: 'e2',
      filePath: 'src/helper.py',
      rationale: 'تغییر x',
      newFullContent: 'x = 2',
      approved: false, // NOT APPROVED
    }
  ];

  const { updatedFiles, appliedCount } = applyApprovedEdits(originalFiles, edits);
  assert.equal(appliedCount, 1);

  const mainPy = updatedFiles.find(f => f.path === 'src/main.py');
  assert.equal(mainPy?.content, 'print("v2 - refined")');
  assert.equal(mainPy?.isModified, true);

  const helperPy = updatedFiles.find(f => f.path === 'src/helper.py');
  assert.equal(helperPy?.content, 'x = 1');
  assert.equal(helperPy?.isModified, undefined);
});

test('computeLineDiff identifies additions, removals and unchanged lines', () => {
  const oldText = 'line1\nline2\nline3';
  const newText = 'line1\nline2_modified\nline3\nline4_added';

  const diff = computeLineDiff(oldText, newText);
  assert.ok(diff.some(d => d.type === 'removed' && d.text === 'line2'));
  assert.ok(diff.some(d => d.type === 'added' && d.text === 'line2_modified'));
  assert.ok(diff.some(d => d.type === 'added' && d.text === 'line4_added'));
});
