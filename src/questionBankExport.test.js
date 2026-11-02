import test from 'node:test';
import assert from 'node:assert/strict';
import readXlsxFile from 'read-excel-file/node';
import { buildQuestionBankWorkbook } from './questionBankExport.js';

test('exports stable question bank columns for multiple-choice and essay rows', async () => {
  const buffer = buildQuestionBankWorkbook(
    { topic: 'Matematika' },
    [
      { type: 'mc', prompt: '2 + 2 = ?', options: ['3', '4', '5', '6'], answerKey: 'B', points: 1 },
      { type: 'essay', prompt: 'Jelaskan.', answerKey: 'Rubrik jawaban', points: 2 },
    ],
  );
  const parsed = await readXlsxFile(Buffer.from(buffer));
  const rows = Array.isArray(parsed[0]?.data) ? parsed[0].data : parsed;
  assert.deepEqual(rows[0], ['No', 'Tipe Soal', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci / Rubrik', 'Bobot', 'Wacana']);
  assert.equal(rows[1][7], 'B');
  assert.equal(rows[2][7], 'Rubrik jawaban');
  assert.equal(rows[2][8], 2);
});