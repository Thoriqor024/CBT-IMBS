import test from 'node:test';
import assert from 'node:assert/strict';
import readXlsxFile from 'read-excel-file/browser';
import { buildStudentImportTemplate } from './studentImportFormat.js';

test('student import template keeps nama siswa and kelas headers in separate Excel columns', async () => {
  const sheets = await readXlsxFile(Buffer.from(buildStudentImportTemplate()));
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].sheet, 'SISWA');
  assert.deepEqual(sheets[0].data[0], ['nama siswa', 'kelas']);
  assert.equal(sheets[0].data.length, 1);
});
