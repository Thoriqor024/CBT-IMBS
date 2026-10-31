import test from 'node:test';
import assert from 'node:assert/strict';
import readXlsxFile from 'read-excel-file/node';
import { unzipSync } from 'fflate';
import { buildResultsWorkbook } from './resultsExport.js';

test('rejects export when any student lacks a final score', () => {
  const rows = [
    { studentName: 'Siswa A', className: 'VII-A', finalScore: 90 },
    { studentName: 'Siswa B', className: 'VII-A', finalScore: null },
  ];
  assert.throws(
    () => buildResultsWorkbook(rows),
    /Semua siswa harus memiliki nilai akhir sebelum diekspor/
  );

  assert.throws(
    () => buildResultsWorkbook([]),
    /Tidak ada data hasil ujian untuk diekspor/
  );
});

test('generates valid XLSX with only Nama, Kelas, Nilai Akhir columns and locked cells', async () => {
  const rows = [
    { studentName: 'Ahmad Fauzi', className: 'VII-A', finalScore: 88.5 },
    { studentName: 'Budi Santoso', className: 'VII-B', finalScore: 95 },
  ];

  const buffer = buildResultsWorkbook(rows);
  assert.ok(buffer instanceof Uint8Array);

  // 1. Verify content with read-excel-file
  const parsed = await readXlsxFile(Buffer.from(buffer));
  const sheetData = Array.isArray(parsed[0]?.data) ? parsed[0].data : parsed;
  assert.deepEqual(sheetData, [
    ['Nama', 'Kelas', 'Nilai Akhir'],
    ['Ahmad Fauzi', 'VII-A', 88.5],
    ['Budi Santoso', 'VII-B', 95],
  ]);

  // 2. Verify sheet protection and locked cell styling in raw XML
  const unzipped = unzipSync(buffer);
  const sheetXml = Buffer.from(unzipped['xl/worksheets/sheet1.xml']).toString('utf-8');
  const stylesXml = Buffer.from(unzipped['xl/styles.xml']).toString('utf-8');

  assert.match(sheetXml, /<sheetProtection password="CCEC" sheet="1"/);
  assert.match(stylesXml, /<protection locked="1"\/>/);
  assert.match(stylesXml, /<protection locked="0"\/>/);

  // Row 2: Col A & B unlocked (s="2"), Col C locked (s="3")
  assert.match(sheetXml, /<c r="A2" s="2"/);
  assert.match(sheetXml, /<c r="B2" s="2"/);
  assert.match(sheetXml, /<c r="C2" s="3"/);
});
