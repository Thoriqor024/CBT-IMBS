const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const statusLabel = status => ({
  draft: 'Draf',
  scheduled: 'Terjadwal',
  active: 'Berlangsung',
  completed: 'Selesai',
}[status] || status || '—');

export function formatSessionDate(value) {
  const raw = String(value ?? '').slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return raw;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function attendanceSessionLabel(exam = {}) {
  const number = Number(exam.sessionNumber) > 0 ? `Sesi ${Number(exam.sessionNumber)}` : 'Sesi belum diatur';
  const date = exam.sessionDate ? formatSessionDate(exam.sessionDate) : '';
  const time = exam.sessionStart && exam.sessionEnd ? `${exam.sessionStart}–${exam.sessionEnd}` : '';
  return [number, date, time].filter(Boolean).join(' · ');
}

export function formatAttendanceTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function buildAttendancePrintHtml(data = {}) {
  const roomName = String(data.room?.name || '').trim();
  const exam = data.exam || {};
  const examTitle = String(exam.title || '').trim();
  const students = Array.isArray(data.students) ? data.students : [];

  if (!roomName || !examTitle) throw new Error('Data ruang dan ujian belum lengkap untuk diekspor.');
  if (data.canExport !== true) throw new Error('Absensi dapat diekspor setelah seluruh sesi ujian selesai.');
  if (!students.length) throw new Error('Belum ada peserta pada ujian ini.');

  const present = students.filter(student => student?.present === true).length;
  const absent = students.length - present;
  const session = attendanceSessionLabel(exam);
  const schoolName = String(data.schoolName || '').trim();
  const printedAt = data.printedAt ? new Date(data.printedAt) : new Date();
  const printedLabel = Number.isNaN(printedAt.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(printedAt);
  const documentTitle = `Absensi ${roomName} - ${examTitle} - ${session}`;

  const rows = students.map((student, index) => {
    const isPresent = student?.present === true;
    return `<tr>
      <td class="number">${index + 1}</td>
      <td class="name">${escapeHtml(student?.name)}</td>
      <td>${escapeHtml(student?.className)}</td>
      <td>${escapeHtml(session)}</td>
      <td><span class="status ${isPresent ? 'present' : 'absent'}">${isPresent ? 'HADIR' : 'ALPA'}</span></td>
      <td class="time">${escapeHtml(isPresent ? formatAttendanceTime(student?.startedAt) : '—')}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(documentTitle)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; background: #fff; color: #172033; font-family: Arial, Helvetica, sans-serif; }
  .sheet { max-width: 900px; margin: 0 auto; }
  .doc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 14px; border-bottom: 3px solid #1f6b4d; }
  .school { margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #4e6b61; }
  h1 { margin: 0; font-size: 22px; line-height: 1.2; color: #173e30; }
  .subtitle { margin: 5px 0 0; font-size: 13px; color: #5d6b7a; }
  .mark { flex: 0 0 auto; padding: 8px 12px; border: 1px solid #b8d6c9; border-radius: 8px; background: #f2f8f5; color: #1f6b4d; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 16px 0; padding: 12px 14px; border: 1px solid #dce5e1; border-radius: 9px; background: #fbfcfc; }
  .meta div { display: grid; gap: 2px; }
  .meta span { font-size: 9px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #809089; }
  .meta b { font-size: 11.5px; color: #2d3d4d; }
  .summary { display: flex; gap: 8px; margin: 0 0 12px; }
  .summary div { min-width: 100px; padding: 8px 12px; border: 1px solid #dce5e1; border-radius: 8px; }
  .summary span { display: block; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #788780; }
  .summary b { display: block; margin-top: 2px; font-size: 17px; color: #23392f; }
  .summary .present { background: #f1f9f4; border-color: #c9e4d5; }
  .summary .absent { background: #fff5f4; border-color: #f0d2cd; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th, td { border: 1px solid #cfdad5; padding: 7px 8px; text-align: left; vertical-align: middle; }
  th { background: #eef5f1; color: #315444; font-size: 9px; letter-spacing: .05em; text-transform: uppercase; }
  td.number { width: 34px; text-align: center; color: #738078; }
  td.name { font-weight: 700; color: #263a31; }
  td.time { width: 72px; text-align: center; white-space: nowrap; }
  .status { display: inline-block; min-width: 54px; padding: 2px 7px; border-radius: 999px; text-align: center; font-size: 9px; font-weight: 700; letter-spacing: .04em; }
  .status.present { background: #dff3e7; color: #17603d; }
  .status.absent { background: #fde5e1; color: #9b2c21; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
  .footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #dce5e1; font-size: 9.5px; color: #718078; }
  .actions { margin-top: 18px; padding: 12px; border-radius: 8px; background: #f4f7f5; text-align: center; }
  .actions button { border: 0; border-radius: 7px; padding: 9px 16px; background: #1f6b4d; color: #fff; font: 700 12px Arial, Helvetica, sans-serif; cursor: pointer; }
  .actions p { margin: 7px 0 0; font-size: 10px; color: #64736b; }
  @media print {
    body { padding: 0; }
    .actions { display: none; }
  }
</style>
</head>
<body>
<main class="sheet">
  <header class="doc-head">
    <div>
      ${schoolName ? `<p class="school">${escapeHtml(schoolName)}</p>` : ''}
      <h1>Daftar Hadir Peserta Ujian</h1>
      <p class="subtitle">${escapeHtml(examTitle)}</p>
    </div>
    <div class="mark">ABSENSI</div>
  </header>

  <section class="meta">
    <div><span>Ruang ujian</span><b>${escapeHtml(roomName)}</b></div>
    <div><span>Mata pelajaran</span><b>${escapeHtml(exam.subject || '—')}</b></div>
    <div><span>Kelas</span><b>${escapeHtml(exam.className || '—')}</b></div>
    <div><span>Sesi ujian</span><b>${escapeHtml(session)}</b></div>
    <div><span>Status ujian</span><b>${escapeHtml(statusLabel(exam.status))}</b></div>
    <div><span>Total peserta</span><b>${students.length} siswa</b></div>
  </section>

  <section class="summary">
    <div class="present"><span>Hadir</span><b>${present}</b></div>
    <div class="absent"><span>Alpa</span><b>${absent}</b></div>
    <div><span>Total</span><b>${students.length}</b></div>
  </section>

  <table>
    <thead>
      <tr><th>No</th><th>Nama siswa</th><th>Kelas</th><th>Sesi ujian</th><th>Status</th><th>Masuk</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <footer class="footer">
    <span>Dicetak ${escapeHtml(printedLabel)}</span>
    <span>Hadir ${present} · Alpa ${absent}</span>
  </footer>

  <div class="actions">
    <button type="button" onclick="window.print()">Cetak / Simpan PDF</button>
    <p>Pada dialog cetak, pilih “Save as PDF” atau “Simpan sebagai PDF”.</p>
  </div>
</main>
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 250);
  });
</script>
</body>
</html>`;
}

export function exportAttendancePdf(data) {
  if (typeof window === 'undefined') throw new Error('Ekspor PDF hanya tersedia di browser.');
  const html = buildAttendancePrintHtml(data);
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Popup diblokir. Izinkan popup untuk mengekspor absensi ke PDF.');
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}
