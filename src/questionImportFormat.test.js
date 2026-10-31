import test from 'node:test';
import assert from 'node:assert/strict';
import readXlsxFile from 'read-excel-file/browser';
import {
  buildQuestionImportTemplate,
  validateQuestionImportSheets,
  WACANA_TEMPLATE_HEADERS,
  PG_TEMPLATE_HEADERS,
  ESSAY_TEMPLATE_HEADERS,
} from './questionImportFormat.js';

const legacyPgHeaders = ['No', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci (A/B/C/D)'];
const legacyEssayHeaders = ['No', 'Pertanyaan', 'Rubrik'];

test('validates PG and essay rows, preserves formulas and defaults blank weights to one', () => {
  const result = validateQuestionImportSheets([
    { sheet: 'PG', data: [[...legacyPgHeaders, 'Bobot nilai'], [1, 'Hitung \\(2x + 3 = 11\\)', '4', '5', '6', '7', 'B', 2]] },
    { sheet: 'ESSAY', data: [[...legacyEssayHeaders, 'Bobot nilai'], [1, 'اكتب الصيغة \\[H_2O\\]', 'Menjelaskan rumus \\(H_2O\\)', '']] },
    { sheet: 'PETUNJUK', data: [['Perihal', 'Petunjuk']] },
  ]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.mc.length, 1);
  assert.equal(result.mc[0].prompt, 'Hitung \\(2x + 3 = 11\\)');
  assert.equal(result.mc[0].answerKey, 'B');
  assert.equal(result.mc[0].points, 2);
  assert.equal(result.mc[0].stimulusIndex, null);
  assert.equal(result.essay[0].rubric, 'Menjelaskan rumus \\(H_2O\\)');
  assert.equal(result.essay[0].points, 1);
  assert.equal(result.essay[0].stimulusIndex, null);
});

test('parses WACANA sheet and links questions via No Wacana', () => {
  const result = validateQuestionImportSheets([
    { sheet: 'PETUNJUK', data: [['Perihal', 'Petunjuk']] },
    {
      sheet: 'WACANA',
      data: [
        WACANA_TEMPLATE_HEADERS,
        [1, 'Cerita Si Kancil', 'Pada suatu hari di pinggir hutan...'],
        [2, 'Data Percobaan Fisika', 'Hasil pengukuran pegas dengan beban berulang...'],
      ],
    },
    {
      sheet: 'PG',
      data: [
        PG_TEMPLATE_HEADERS,
        [1, 1, 'Siapa tokoh utama cerita di atas?', 'Kancil', 'Buaya', 'Gajah', 'Harimau', 'A'],
        [2, '', 'Berapa hasil 5 + 5?', '10', '11', '12', '13', 'A'],
      ],
    },
    {
      sheet: 'ESSAY',
      data: [
        ESSAY_TEMPLATE_HEADERS,
        [1, 2, 'Jelaskan hubungan beban dengan pertambahan panjang pegas!', 'Menjelaskan hukum Hooke.'],
      ],
    },
  ]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.stimuli.length, 2);
  assert.equal(result.stimuli[0].title, 'Cerita Si Kancil');
  assert.equal(result.stimuli[1].title, 'Data Percobaan Fisika');
  assert.equal(result.mc[0].stimulusIndex, 0);
  assert.equal(result.mc[1].stimulusIndex, null);
  assert.equal(result.essay[0].stimulusIndex, 1);
});

test('reports error when No Wacana does not match any entry in WACANA sheet', () => {
  const result = validateQuestionImportSheets([
    { sheet: 'PETUNJUK', data: [['Perihal', 'Petunjuk']] },
    {
      sheet: 'WACANA',
      data: [
        WACANA_TEMPLATE_HEADERS,
        [1, 'Wacana 1', 'Isi teks wacana 1'],
      ],
    },
    {
      sheet: 'PG',
      data: [
        PG_TEMPLATE_HEADERS,
        [1, 99, 'Pertanyaan soal?', 'A', 'B', 'C', 'D', 'A'],
      ],
    },
    { sheet: 'ESSAY', data: [ESSAY_TEMPLATE_HEADERS] },
  ]);
  assert.ok(result.errors.some(error => error.includes('No Wacana "99" tidak cocok')));
});

test('rejects malformed rows and identifies the Excel row', () => {
  const result = validateQuestionImportSheets([
    { sheet: 'PG', data: [[...legacyPgHeaders, 'Bobot nilai'], [1, 'Soal valid', 'A', 'B', 'C', 'D', 'A', 1], [2, 'Soal \\(rumus', 'A', '', 'C', 'D', 'E', -1]] },
    { sheet: 'ESSAY', data: [[...legacyEssayHeaders, 'Bobot nilai']] },
  ]);
  assert.ok(result.errors.some(error => error.startsWith('PG baris 3:')));
  assert.ok(result.errors.some(error => error.includes('pembatas rumus')));
  assert.ok(result.errors.some(error => error.includes('opsi B wajib diisi')));
  assert.ok(result.errors.some(error => error.includes('kunci jawaban harus A')));
  assert.ok(result.errors.some(error => error.includes('bobot nilai harus')));
});

test('imports the requested columns without a weight column using the default weight', () => {
  const result = validateQuestionImportSheets([
    { sheet: 'PETUNJUK', data: [['Perihal', 'Petunjuk']] },
    { sheet: 'PG', data: [legacyPgHeaders, [1, 'Soal', 'A', 'B', 'C', 'D', 'A']] },
    { sheet: 'ESSAY', data: [legacyEssayHeaders, [1, 'Jelaskan', 'Rubrik']] },
  ]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.mc[0].points, 1);
  assert.equal(result.essay[0].points, 1);
});

test('rejects a workbook without the required sheet names or headers', () => {
  const result = validateQuestionImportSheets([{ sheet: 'Sheet1', data: [['Pertanyaan']] }]);
  assert.ok(result.errors.some(error => error.includes('Sheet "PETUNJUK" tidak ditemukan')));
  assert.ok(result.errors.some(error => error.includes('Sheet "PG" tidak ditemukan')));
  assert.ok(result.errors.some(error => error.includes('Sheet "ESSAY" tidak ditemukan')));
});

test('enforces the 1,000 question bank limit', () => {
  const rows = [legacyPgHeaders];
  for (let index = 0; index < 1001; index++) rows.push([index + 1, 'Soal ' + (index + 1), 'A', 'B', 'C', 'D', 'A', 1]);
  const result = validateQuestionImportSheets([
    { sheet: 'PG', data: rows },
    { sheet: 'ESSAY', data: [legacyEssayHeaders] },
  ]);
  assert.ok(result.errors.includes('Jumlah soal melebihi batas 1.000 soal dalam satu bank.'));
});

test('generated template is a readable XLSX with instructions, WACANA, PG and essay sheets', async () => {
  const sheets = await readXlsxFile(Buffer.from(buildQuestionImportTemplate()));
  const byName = new Map(sheets.map(item => [item.sheet, item.data]));
  assert.deepEqual(byName.get('WACANA')[0], WACANA_TEMPLATE_HEADERS);
  assert.deepEqual(byName.get('PG')[0], PG_TEMPLATE_HEADERS);
  assert.deepEqual(byName.get('ESSAY')[0], ESSAY_TEMPLATE_HEADERS);
  assert.ok(byName.get('PETUNJUK').some(row => String(row[0]).toLowerCase().includes('gambar')));
  assert.ok(byName.get('PETUNJUK').some(row => String(row[1]).includes('\\( dan \\)')));
  assert.ok(byName.get('PETUNJUK').some(row => String(row[0]).includes('Contoh wacana')));
  assert.ok(byName.get('PETUNJUK').some(row => String(row[0]).includes('Contoh PG terhubung')));
  assert.ok(byName.get('PETUNJUK').some(row => String(row[0]).includes('Contoh essay terhubung')));
});
