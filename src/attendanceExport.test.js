import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceSessionLabel, buildAttendancePrintHtml, formatSessionDate } from './attendanceExport.js';

const base = {
  schoolName: 'IMBS Islamic School',
  room: { name: 'Ruang 01' },
  exam: {
    title: 'Penilaian Tengah Semester',
    subject: 'Matematika',
    className: 'VII A, VII B',
    status: 'completed',
    sessionNumber: 1,
    sessionDate: '2026-11-19',
    sessionStart: '08:00',
    sessionEnd: '10:00',
  },
  students: [
    { name: 'Ahmad Fadhil', className: 'VII A', present: true, startedAt: '2026-11-19T01:05:00.000Z' },
    { name: 'Bilal & <Saleh>', className: 'VII B', present: false, startedAt: null },
  ],
  canExport: true,
  printedAt: '2026-11-19T10:30:00.000Z',
};

test('builds a printable attendance sheet with room, exam session, present and absent rows', () => {
  const html = buildAttendancePrintHtml(base);
  assert.match(html, /Daftar Hadir Peserta Ujian/);
  assert.match(html, /Ruang 01/);
  assert.match(html, /Penilaian Tengah Semester/);
  assert.match(html, /Sesi 1 · 19 November 2026 · 08:00–10:00/);
  assert.match(html, /Ahmad Fadhil/);
  assert.match(html, />HADIR</);
  assert.match(html, />ALPA</);
  assert.match(html, /Bilal &amp; &lt;Saleh&gt;/);
  assert.match(html, /window.print\(\)/);
});

test('uses a readable session label and rejects exports that are not finished', () => {
  assert.equal(attendanceSessionLabel({ sessionNumber: 2, sessionDate: '2026-11-20' }), 'Sesi 2 · 20 November 2026');
  assert.equal(formatSessionDate('2026-11-19'), '19 November 2026');
  assert.throws(
    () => buildAttendancePrintHtml({ ...base, canExport: false }),
    /setelah seluruh sesi ujian selesai/,
  );
  assert.throws(
    () => buildAttendancePrintHtml({ ...base, students: [] }),
    /Belum ada peserta/,
  );
});
