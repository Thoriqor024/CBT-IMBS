import { strToU8, zipSync } from 'fflate';

const escapeXml = value => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export function buildResultsWorkbook(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Tidak ada data hasil ujian untuk diekspor.');
  }
  const hasUngraded = rows.some(r => r.finalScore === null || r.finalScore === undefined);
  if (hasUngraded) {
    throw new Error('Semua siswa harus memiliki nilai akhir sebelum diekspor.');
  }

  const headerXml = '<row r="1">' +
    '<c r="A1" s="1" t="inlineStr"><is><t>Nama</t></is></c>' +
    '<c r="B1" s="1" t="inlineStr"><is><t>Kelas</t></is></c>' +
    '<c r="C1" s="1" t="inlineStr"><is><t>Nilai Akhir</t></is></c>' +
    '</row>';

  const dataXml = rows.map((r, i) => {
    const rowNum = i + 2;
    const scoreVal = Number(r.finalScore);
    const scoreFormatted = Number.isFinite(scoreVal) ? scoreVal : 0;
    return `<row r="${rowNum}">` +
      `<c r="A${rowNum}" s="2" t="inlineStr"><is><t xml:space="preserve">${escapeXml(r.studentName).slice(0, 32000)}</t></is></c>` +
      `<c r="B${rowNum}" s="2" t="inlineStr"><is><t xml:space="preserve">${escapeXml(r.studentClassName ?? r.className).slice(0, 32000)}</t></is></c>` +
      `<c r="C${rowNum}" s="3" t="n"><v>${scoreFormatted}</v></c>` +
      `</row>`;
  }).join('');

  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="2">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF6F1"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border>' +
        '<left style="thin"><color rgb="FFDCE7E0"/></left>' +
        '<right style="thin"><color rgb="FFDCE7E0"/></right>' +
        '<top style="thin"><color rgb="FFDCE7E0"/></top>' +
        '<bottom style="thin"><color rgb="FFDCE7E0"/></bottom>' +
        '<diagonal/>' +
      '</border>' +
    '</borders>' +
    '<cellStyleXfs count="1">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
    '</cellStyleXfs>' +
    '<cellXfs count="4">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyProtection="1">' +
        '<alignment horizontal="center" vertical="center"/><protection locked="1"/>' +
      '</xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyProtection="1">' +
        '<protection locked="0"/>' +
      '</xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1" applyProtection="1">' +
        '<alignment horizontal="center"/><protection locked="1"/>' +
      '</xf>' +
    '</cellXfs>' +
    '</styleSheet>';

  const worksheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="A1:C${rows.length + 1}"/>` +
    '<sheetViews><sheetView showGridLines="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<cols>' +
      '<col min="1" max="1" width="30" customWidth="1"/>' +
      '<col min="2" max="2" width="18" customWidth="1"/>' +
      '<col min="3" max="3" width="16" customWidth="1"/>' +
    '</cols>' +
    `<sheetData>${headerXml}${dataXml}</sheetData>` +
    '<sheetProtection password="CCEC" sheet="1" objects="1" scenarios="1" selectLockedCells="1" selectUnlockedCells="1"/>' +
    '</worksheet>';

  const files = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hasil Ujian" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8(styles),
    'xl/worksheets/sheet1.xml': strToU8(worksheet),
  };

  return zipSync(files, { level: 6 });
}

export function exportResults(rows, filename = 'hasil-ujian-imbs.xlsx') {
  if (!rows || !rows.length) return;
  const hasUngraded = rows.some(r => r.finalScore === null || r.finalScore === undefined);
  if (hasUngraded) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Eksport Excel hanya dapat dilakukan ketika semua siswa sudah mendapatkan nilai akhir.');
    }
    return;
  }
  const workbook = buildResultsWorkbook(rows);
  const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

