import test from 'node:test';
import assert from 'node:assert/strict';
import { buildItemAnalysisWorkbook } from './itemAnalysisExport.js';

test('rejects export with empty items list', () => {
  assert.throws(() => buildItemAnalysisWorkbook([]), /Tidak ada butir soal untuk diekspor/);
});

test('generates valid XLSX binary for item analysis', () => {
  const sampleItems = [
    {
      number: 1,
      type: 'mc',
      prompt: 'Berapakah 2 + 2?',
      points: 1,
      totalAssigned: 30,
      totalAnswered: 28,
      totalCorrect: 25,
      totalIncorrect: 3,
      totalBlank: 2,
      difficultyIndex: 0.83,
      difficulty: 'Mudah',
    },
    {
      number: 2,
      type: 'essay',
      prompt: 'Jelaskan proses fotosintesis!',
      points: 2,
      totalAssigned: 30,
      totalAnswered: 26,
      totalCorrect: 12,
      totalIncorrect: 14,
      totalBlank: 4,
      difficultyIndex: 0.40,
      difficulty: 'Sedang',
    },
  ];

  const buffer = buildItemAnalysisWorkbook(sampleItems, 'Ujian Matematika');
  assert.ok(buffer instanceof Uint8Array);
  assert.ok(buffer.length > 100);
  // Zip signature PK\x03\x04
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);
});

