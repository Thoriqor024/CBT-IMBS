import { strToU8, zipSync } from 'fflate';

const escapeXml = value => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export function buildItemAnalysisWorkbook(items, examTitle = 'Analisis Soal') {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Tidak ada butir soal untuk diekspor.');
  }

  const headerXml = '<row r="1">' +
    '<c r="A1" s="1" t="inlineStr"><is><t>No</t></is></c>' +
    '<c r="B1" s="1" t="inlineStr"><is><t>Tipe Soal</t></is></c>' +
    '<c r="C1" s="1" t="inlineStr"><is><t>Pertanyaan</t></is></c>' +
    '<c r="D1" s="1" t="inlineStr"><is><t>Bobot</t></is></c>' +
    '<c r="E1" s="1" t="inlineStr"><is><t>Peserta</t></is></c>' +
    '<c r="F1" s="1" t="inlineStr"><is><t>Terjawab</t></is></c>' +
    '<c r="G1" s="1" t="inlineStr"><is><t>Benar</t></is></c>' +
    '<c r="H1" s="1" t="inlineStr"><is><t>Salah</t></is></c>' +
    '<c r="I1" s="1" t="inlineStr"><is><t>Kosong</t></is></c>' +
    '<c r="J1" s="1" t="inlineStr"><is><t>Tingkat Kesulitan</t></is></c>' +
    '<c r="K1" s="1" t="inlineStr"><is><t>Indeks (P)</t></is></c>' +
    '</row>';

  const dataXml = items.map((item, i) => {
    const rowNum = i + 2;
    const typeLabel = item.type === 'mc' ? 'Pilihan Ganda' : 'Essay';
    const pValue = Number(item.difficultyIndex ?? 0);
    return `<row r="${rowNum}">` +
      `<c r="A${rowNum}" s="2" t="n"><v>${item.number || (i + 1)}</v></c>` +
      `<c r="B${rowNum}" s="2" t="inlineStr"><is><t xml:space="preserve">${escapeXml(typeLabel)}</t></is></c>` +
      `<c r="C${rowNum}" s="3" t="inlineStr"><is><t xml:space="preserve">${escapeXml(item.prompt).slice(0, 32000)}</t></is></c>` +
      `<c r="D${rowNum}" s="2" t="n"><v>${Number(item.points || 1)}</v></c>` +
      `<c r="E${rowNum}" s="2" t="n"><v>${Number(item.totalAssigned || 0)}</v></c>` +
      `<c r="F${rowNum}" s="2" t="n"><v>${Number(item.totalAnswered || 0)}</v></c>` +
      `<c r="G${rowNum}" s="2" t="n"><v>${Number(item.totalCorrect || 0)}</v></c>` +
      `<c r="H${rowNum}" s="2" t="n"><v>${Number(item.totalIncorrect || 0)}</v></c>` +
      `<c r="I${rowNum}" s="2" t="n"><v>${Number(item.totalBlank || 0)}</v></c>` +
      `<c r="J${rowNum}" s="2" t="inlineStr"><is><t xml:space="preserve">${escapeXml(item.difficulty || 'Sedang')}</t></is></c>` +
      `<c r="K${rowNum}" s="2" t="n"><v>${pValue}</v></c>` +
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
      '<xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
        '<alignment horizontal="center" vertical="center"/>' +
      '</xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">' +
        '<alignment horizontal="center" vertical="center"/>' +
      '</xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">' +
        '<alignment horizontal="left" vertical="center" wrapText="1"/>' +
      '</xf>' +
    '</cellXfs>' +
    '</styleSheet>';

  const worksheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="A1:K${items.length + 1}"/>` +
    '<sheetViews><sheetView showGridLines="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<cols>' +
      '<col min="1" max="1" width="6" customWidth="1"/>' +
      '<col min="2" max="2" width="16" customWidth="1"/>' +
      '<col min="3" max="3" width="45" customWidth="1"/>' +
      '<col min="4" max="4" width="8" customWidth="1"/>' +
      '<col min="5" max="5" width="10" customWidth="1"/>' +
      '<col min="6" max="6" width="10" customWidth="1"/>' +
      '<col min="7" max="7" width="10" customWidth="1"/>' +
      '<col min="8" max="8" width="10" customWidth="1"/>' +
      '<col min="9" max="9" width="10" customWidth="1"/>' +
      '<col min="10" max="10" width="18" customWidth="1"/>' +
      '<col min="11" max="11" width="12" customWidth="1"/>' +
    '</cols>' +
    `<sheetData>${headerXml}${dataXml}</sheetData>` +
    '</worksheet>';

  const files = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Analisis Soal" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8(styles),
    'xl/worksheets/sheet1.xml': strToU8(worksheet),
  };

  return zipSync(files, { level: 6 });
}

export function exportItemAnalysis(items, filename = 'analisis-soal.xlsx') {
  if (!items || !items.length) return;
  const workbook = buildItemAnalysisWorkbook(items);
  const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

