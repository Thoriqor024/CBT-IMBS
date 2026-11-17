import { strToU8, zipSync } from 'fflate';

const escapeXml = value => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const sheetName = (value, fallback) => {
  const cleaned = String(value ?? '').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return cleaned || fallback;
};

export function buildRoomWorkbook(room) {
  const students = Array.isArray(room?.students) ? room.students : [];
  if (!students.length) throw new Error('Ruang ujian belum memiliki siswa untuk diekspor.');
  const roomName = String(room?.name || 'Ruang Ujian');
  const name = sheetName(roomName, 'Ruang Ujian');

  const header = ['NO', 'NAMA SISWA', 'USERNAME', 'KELAS', 'RUANG'];
  const headerXml = '<row r="1">' + header.map((label, index) =>
    `<c r="${String.fromCharCode(65 + index)}1" s="1" t="inlineStr"><is><t>${escapeXml(label)}</t></is></c>`).join('') + '</row>';

  const dataXml = students.map((student, index) => {
    const row = index + 2;
    const cells = [
      `<c r="A${row}" s="3" t="n"><v>${index + 1}</v></c>`,
      `<c r="B${row}" s="2" t="inlineStr"><is><t>${escapeXml(student.name)}</t></is></c>`,
      `<c r="C${row}" s="2" t="inlineStr"><is><t>${escapeXml(student.username)}</t></is></c>`,
      `<c r="D${row}" s="2" t="inlineStr"><is><t>${escapeXml(student.className)}</t></is></c>`,
      `<c r="E${row}" s="2" t="inlineStr"><is><t>${escapeXml(roomName)}</t></is></c>`,
    ];
    return `<row r="${row}">${cells.join('')}</row>`;
  }).join('');

  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF6F1"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFDCE7E0"/></left><right style="thin"><color rgb="FFDCE7E0"/></right><top style="thin"><color rgb="FFDCE7E0"/></top><bottom style="thin"><color rgb="FFDCE7E0"/></bottom><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center"/></xf></cellXfs>'
    + '</styleSheet>';

  const worksheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<dimension ref="A1:E${students.length + 1}"/>`
    + '<sheetViews><sheetView showGridLines="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + '<cols><col min="1" max="1" width="7" customWidth="1"/><col min="2" max="2" width="30" customWidth="1"/><col min="3" max="3" width="22" customWidth="1"/><col min="4" max="4" width="18" customWidth="1"/><col min="5" max="5" width="16" customWidth="1"/></cols>'
    + `<sheetData>${headerXml}${dataXml}</sheetData>`
    + '</worksheet>';

  const files = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + escapeXml(name) + '" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8(styles),
    'xl/worksheets/sheet1.xml': strToU8(worksheet),
  };

  return zipSync(files, { level: 6 });
}

export function exportRoom(room) {
  const workbook = buildRoomWorkbook(room);
  const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `ruang-${String(room?.name || 'ujian').replace(/\s+/g, '-').toLowerCase()}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
