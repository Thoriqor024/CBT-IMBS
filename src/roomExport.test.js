import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import { buildRoomWorkbook } from './roomExport.js';

test('builds a room workbook with student rows and the room name as the sheet title', () => {
  const workbook = buildRoomWorkbook({
    name: 'Ruang 01',
    students: [
      { name: 'Ahmad Fadhil', username: 'IMBS-001', className: 'VII A' },
      { name: 'Bilal', username: 'IMBS-002', className: 'VIII A' },
    ],
  });
  const files = unzipSync(workbook);
  const worksheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  const workbookXml = strFromU8(files['xl/workbook.xml']);
  assert.match(worksheet, /NAMA SISWA/);
  assert.match(worksheet, /Ahmad Fadhil/);
  assert.match(worksheet, /VIII A/);
  assert.match(worksheet, /Ruang 01/);
  assert.match(workbookXml, /name="Ruang 01"/);
});

test('rejects exporting a room without students', () => {
  assert.throws(() => buildRoomWorkbook({ name: 'Ruang kosong', students: [] }), /belum memiliki siswa/);
});
