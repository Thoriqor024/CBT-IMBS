import { strToU8, zipSync } from 'fflate';

const escapeXml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

function cell(value, reference, style = '') {
  return `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t>${escapeXml(value)}</t></is></c>`;
}

/**
 * @param {{ classes?: string[], subjects?: string[] }} opts
 */
export function buildTeacherImportTemplate({ classes = [], subjects = [] } = {}) {
  // Build rows for the hidden _DATA sheet that holds dropdown source lists
  const maxRows = Math.max(classes.length, subjects.length, 1);
  let dataRows = '';
  for (let i = 0; i < maxRows; i++) {
    const r = i + 1;
    let cells = '';
    if (i < classes.length) cells += cell(classes[i], `A${r}`);
    if (i < subjects.length) cells += cell(subjects[i], `B${r}`);
    dataRows += `<row r="${r}">${cells}</row>`;
  }

  // Data validation references (only add if there's data)
  let validations = '';
  const parts = [];
  if (classes.length) {
    parts.push(`<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="D2:D1001"><formula1>_DATA!$A$1:$A$${classes.length}</formula1></dataValidation>`);
  }
  if (subjects.length) {
    parts.push(`<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="E2:E1001"><formula1>_DATA!$B$1:$B$${subjects.length}</formula1></dataValidation>`);
  }
  if (parts.length) {
    validations = `<dataValidations count="${parts.length}">${parts.join('')}</dataValidations>`;
  }

  const files = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="GURU" sheetId="1" r:id="rId1"/><sheet name="_DATA" sheetId="2" state="veryHidden" r:id="rId2"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF6F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'),
    'xl/worksheets/sheet1.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:E1"/><sheetViews><sheetView showGridLines="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="18" customWidth="1"/><col min="4" max="4" width="15" customWidth="1"/><col min="5" max="5" width="25" customWidth="1"/></cols><sheetData><row r="1">' + cell('nama', 'A1', '1') + cell('username', 'B1', '1') + cell('password', 'C1', '1') + cell('kelas', 'D1', '1') + cell('mata pelajaran', 'E1', '1') + '</row></sheetData><autoFilter ref="A1:E1001"/>' + validations + '</worksheet>'),
    // Hidden sheet holding the dropdown source data
    'xl/worksheets/sheet2.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + dataRows + '</sheetData></worksheet>'),
  };
  return zipSync(files, { level: 6 });
}

export function downloadTeacherImportTemplate({ classes = [], subjects = [] } = {}) {
  const workbook = buildTeacherImportTemplate({ classes, subjects });
  const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template-import-guru-imbs.xlsx';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}