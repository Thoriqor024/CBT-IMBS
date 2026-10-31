import { strToU8, zipSync } from 'fflate';

export const QUESTION_IMPORT_MAX = 1000;
const REQUIRED_PG_HEADERS = ['Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci (A/B/C/D)'];
const REQUIRED_ESSAY_HEADERS = ['Pertanyaan', 'Rubrik'];

export const WACANA_TEMPLATE_HEADERS = ['No', 'Judul Wacana', 'Isi Teks / Cerita'];
export const PG_TEMPLATE_HEADERS = ['No', 'No Wacana', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci (A/B/C/D)'];
export const ESSAY_TEMPLATE_HEADERS = ['No', 'No Wacana', 'Pertanyaan', 'Rubrik'];

const normalizeHeader = value => String(value ?? '').toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g, ' ').trim();
const cellText = value => value === null || value === undefined ? '' : String(value).trim();
const isBlank = value => value === null || value === undefined || String(value).trim() === '';

export function validateQuestionImportSheets(sheets) {
  const errors = [];
  const byName = new Map((Array.isArray(sheets) ? sheets : []).map(item => [
    String(item?.sheet ?? item?.name ?? '').trim().toLocaleLowerCase('id-ID'),
    item?.data ?? item?.rows ?? [],
  ]));
  if (!byName.has('petunjuk')) errors.push('Sheet "PETUNJUK" tidak ditemukan. Gunakan workbook dari template resmi.');
  const pgSheet = byName.get('pg');
  const essaySheet = byName.get('essay');
  if (!pgSheet) errors.push('Sheet "PG" tidak ditemukan. Gunakan nama sheet dari template.');
  if (!essaySheet) errors.push('Sheet "ESSAY" tidak ditemukan. Gunakan nama sheet dari template.');

  const wacanaSheet = byName.get('wacana') || byName.get('stimulus');
  const stimuli = wacanaSheet ? parseWacanaSheet(wacanaSheet, errors) : [];

  const mc = pgSheet ? parseQuestionSheet(pgSheet, 'PG', REQUIRED_PG_HEADERS, stimuli, errors) : [];
  const essay = essaySheet ? parseQuestionSheet(essaySheet, 'ESSAY', REQUIRED_ESSAY_HEADERS, stimuli, errors) : [];
  if (mc.length + essay.length > QUESTION_IMPORT_MAX) {
    errors.push('Jumlah soal melebihi batas 1.000 soal dalam satu bank.');
  }
  if (mc.length + essay.length === 0 && errors.length === 0) {
    errors.push('Belum ada soal berisi. Isi minimal satu soal di sheet PG atau ESSAY.');
  }
  return { mc, essay, stimuli, errors };
}

function parseWacanaSheet(rows, errors) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  const indices = new Map();
  headers.forEach((header, index) => {
    if (!header) return;
    if (indices.has(header)) errors.push('Sheet WACANA: judul kolom "' + header + '" muncul lebih dari sekali.');
    else indices.set(header, index);
  });
  const titleHeader = ['judul wacana', 'judul'].find(h => indices.has(h));
  if (!titleHeader) {
    errors.push('Sheet WACANA: kolom wajib belum lengkap: Judul Wacana. Unduh dan gunakan template resmi.');
    return [];
  }
  const noCol = ['no', 'nomor'].map(h => indices.get(h)).find(idx => idx !== undefined);
  const titleCol = indices.get(titleHeader);
  const contentCol = ['isi teks cerita', 'isi teks', 'isi', 'cerita'].map(h => indices.get(h)).find(idx => idx !== undefined);

  const stimuli = [];
  rows.slice(1).forEach((row, index) => {
    const excelRow = index + 2;
    if (!Array.isArray(row) || row.every(isBlank)) return;
    const rawRef = noCol !== undefined ? cellText(row[noCol]) : '';
    const ref = rawRef || String(stimuli.length + 1);
    const title = cellText(row[titleCol]);
    const content = contentCol !== undefined ? cellText(row[contentCol]) : '';
    if (!title) {
      errors.push('WACANA baris ' + excelRow + ': judul wacana wajib diisi.');
      return;
    }
    if (content && invalidFormulaDelimiters(content)) {
      errors.push('WACANA baris ' + excelRow + ': pembatas rumus pada isi wacana tidak berpasangan.');
      return;
    }
    stimuli.push({ ref, title, content });
  });
  return stimuli;
}

function parseQuestionSheet(rows, sheetName, requiredHeaders, stimuli, errors) {
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push('Sheet ' + sheetName + ' tidak memiliki baris judul kolom.');
    return [];
  }
  const headers = rows[0].map(normalizeHeader);
  const indices = new Map();
  headers.forEach((header, index) => {
    if (!header) return;
    if (indices.has(header)) errors.push('Sheet ' + sheetName + ': judul kolom "' + header + '" muncul lebih dari sekali.');
    else indices.set(header, index);
  });
  const expected = requiredHeaders.map(header => [header, normalizeHeader(header)]);
  const missing = expected.filter(([, normalized]) => !indices.has(normalized)).map(([header]) => header);
  if (missing.length) {
    errors.push('Sheet ' + sheetName + ': kolom wajib belum lengkap: ' + missing.join(', ') + '. Unduh dan gunakan template resmi.');
    return [];
  }
  const column = header => indices.get(normalizeHeader(header));
  const imported = [];

  rows.slice(1).forEach((row, index) => {
    const excelRow = index + 2;
    if (!Array.isArray(row) || row.every(isBlank)) return;
    const read = header => {
      const col = column(header);
      return col !== undefined ? row[col] ?? '' : '';
    };
    const prompt = cellText(read('Pertanyaan'));
    const issue = message => errors.push(sheetName + ' baris ' + excelRow + ': ' + message);
    if (!prompt) issue('pertanyaan wajib diisi.');
    if (prompt && invalidFormulaDelimiters(prompt)) issue('pembatas rumus tidak berpasangan. Gunakan \\( ... \\) atau \\[ ... \\].');

    const pointsValue = read('Bobot nilai');
    const points = parsePoints(pointsValue);
    if (points === null) issue('bobot nilai harus berupa angka lebih besar dari 0; sel kosong memakai nilai 1.');

    const wacanaVal = cellText(read('No Wacana') || read('Wacana') || read('No Stimulus'));
    let stimulusIndex = null;
    if (wacanaVal) {
      if (!stimuli || stimuli.length === 0) {
        issue('No Wacana "' + wacanaVal + '" diisi, tetapi sheet WACANA tidak ditemukan atau belum berisi data wacana.');
      } else {
        const found = stimuli.findIndex((s, sIdx) => String(s.ref).trim() === wacanaVal || String(sIdx + 1) === wacanaVal);
        if (found >= 0) {
          stimulusIndex = found;
        } else {
          issue('No Wacana "' + wacanaVal + '" tidak cocok dengan nomor wacana mana pun di sheet WACANA.');
        }
      }
    }

    if (sheetName === 'PG') {
      const options = ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'].map(read).map(cellText);
      options.forEach((option, optionIndex) => {
        if (!option) issue('opsi ' + String.fromCharCode(65 + optionIndex) + ' wajib diisi.');
        else if (invalidFormulaDelimiters(option)) issue('pembatas rumus pada opsi ' + String.fromCharCode(65 + optionIndex) + ' tidak berpasangan.');
      });
      const rawKey = cellText(read('Kunci (A/B/C/D)')).toUpperCase();
      const keys = [...new Set(rawKey.split(/[^A-Z0-9]+/).map(k => k.trim()).filter(Boolean))];
      const validOptions = ['A', 'B', 'C', 'D'];
      if (keys.length === 0 || keys.some(k => !validOptions.includes(k))) {
        issue('kunci jawaban harus A, B, C, atau D (bisa lebih dari satu dipisah koma untuk PG Kompleks, contoh: A, C).');
      } else if (keys.some(k => !options['ABCD'.indexOf(k)])) {
        issue('kunci jawaban harus menunjuk opsi yang terisi.');
      }
      if (prompt && options.every(Boolean) && keys.length > 0 && keys.every(k => validOptions.includes(k) && options['ABCD'.indexOf(k)]) && points !== null
        && !invalidFormulaDelimiters(prompt) && !options.some(invalidFormulaDelimiters)) {
        keys.sort();
        const isComplex = keys.length > 1;
        imported.push({
          type: isComplex ? 'complex_mc' : 'mc',
          prompt,
          options,
          answerKey: keys.join(','),
          points,
          stimulusIndex
        });
      }
    } else {
      const rubric = cellText(read('Rubrik'));
      if (!rubric) issue('rubrik / panduan koreksi wajib diisi.');
      else if (invalidFormulaDelimiters(rubric)) issue('pembatas rumus pada rubrik tidak berpasangan.');
      if (prompt && rubric && points !== null && !invalidFormulaDelimiters(prompt) && !invalidFormulaDelimiters(rubric)) {
        imported.push({ prompt, rubric, points, stimulusIndex });
      }
    }
  });
  return imported;
}

function parsePoints(value) {
  if (isBlank(value)) return 1;
  if (typeof value === 'boolean' || value instanceof Date) return null;
  const number = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function invalidFormulaDelimiters(text) {
  const pairs = [['\\(', '\\)'], ['\\[', '\\]']];
  let active = null;
  for (let index = 0; index < text.length; index++) {
    const pair = pairs.find(([open, close]) => text.startsWith(open, index) || text.startsWith(close, index));
    if (!pair) continue;
    const [open, close] = pair;
    if (text.startsWith(open, index)) {
      if (active) return true;
      active = pair;
      index += open.length - 1;
    } else {
      if (active !== pair) return true;
      active = null;
      index += close.length - 1;
    }
  }
  return active !== null;
}

const xmlEscape = value => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&apos;');

function columnName(index) {
  let name = '';
  for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + (value - 1) % 26) + name;
  }
  return name;
}

function worksheetCell(value, reference, style = '') {
  const styleAttribute = style ? ' s=\"' + style + '\"' : '';
  if (value === null || value === undefined || value === '') return '<c r=\"' + reference + '\"' + styleAttribute + '/>';
  if (typeof value === 'number' && Number.isFinite(value)) return '<c r=\"' + reference + '\" t=\"n\"' + styleAttribute + '><v>' + value + '</v></c>';
  return '<c r=\"' + reference + '\" t=\"inlineStr\"' + styleAttribute + '><is><t xml:space=\"preserve\">' + xmlEscape(value) + '</t></is></c>';
}

function worksheetXml(name, rows, widths, options = {}) {
  const lastColumn = columnName(widths.length - 1);
  const dimension = 'A1:' + lastColumn + rows.length;
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const style = options.headerRow === rowIndex + 1 ? '1' : options.bodyRows ? '2' : '';
      return worksheetCell(value, columnName(columnIndex) + (rowIndex + 1), style);
    }).join('');
    const rowHeight = options.bodyRows && rowIndex > 0 ? ' ht=\"36\" customHeight=\"1\"' : '';
    return '<row r=\"' + (rowIndex + 1) + '\"' + rowHeight + '>' + cells + '</row>';
  }).join('');
  const cols = widths.map((width, index) => '<col min=\"' + (index + 1) + '\" max=\"' + (index + 1) + '\" width=\"' + width + '\" customWidth=\"1\"/>').join('');
  const filter = options.filter ? '<autoFilter ref=\"A1:' + lastColumn + '1001\"/>' : '';
  const validations = '';
  return '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><dimension ref=\"' + dimension + '\"/><sheetViews><sheetView showGridLines=\"1\" workbookViewId=\"0\"><pane ySplit=\"' + (options.freezeRows || 0) + '\" topLeftCell=\"A' + ((options.freezeRows || 0) + 1) + '\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews><cols>' + cols + '</cols><sheetData>' + sheetRows + '</sheetData>' + filter + validations + '</worksheet>';
}

export function buildQuestionImportTemplate() {
  const guide = [
    ['PANDUAN IMPORT SOAL CBT IMBS', ''],
    ['Perihal', 'Petunjuk pengisian'],
    ['Persiapan', 'Di halaman Buat bank soal, pilih mata pelajaran, topik/materi, dan kelas sebelum mengimpor workbook ini.'],
    ['Satu bank', 'Gunakan satu file untuk satu bank soal. Soal dari sheet PG dan ESSAY akan masuk ke bank yang sedang dibuat.'],
    ['Mulai mengisi', 'Isi baris mulai dari baris 2 pada sheet PG dan/atau ESSAY. Satu baris hanya untuk satu soal. Baris kosong akan diabaikan.'],
    ['Sheet dan judul kolom', 'Jangan mengubah nama sheet WACANA, PG, dan ESSAY, judul kolom, atau urutan kolom. Jangan menggabungkan sel. Simpan file sebagai .xlsx.'],
    ['Wacana / Stimulus (opsional)', 'Gunakan sheet WACANA jika ada teks cerita, bacaan, atau data stimulus yang dipakai bersama oleh beberapa soal.'],
    ['Menghubungkan wacana', 'Pada sheet PG atau ESSAY, isi kolom "No Wacana" dengan nomor wacana terkait (contoh: 1). Jika soal berdiri sendiri, kosongkan kolom ini.'],
    ['Nomor soal', 'Kolom No hanya untuk referensi guru. Urutan import mengikuti urutan baris Excel; kolom ini boleh dikosongkan.'],
    ['Soal PG & PG Kompleks', 'Isi No Wacana (opsional), Pertanyaan, Opsi A sampai D, dan Kunci. Kunci harus A, B, C, atau D (PG biasa) atau dipisah koma contoh "A, C" untuk PG Kompleks.'],
    ['Soal essay', 'Isi No Wacana (opsional), Pertanyaan, dan Rubrik / panduan koreksi pada sheet ESSAY.'],
    ['Contoh wacana', '1 | Kisah Kejujuran Pedagang | Di sebuah pasar tua di Baghdad, hiduplah seorang pedagang...'],
    ['Contoh PG terhubung', '1 | 1 | Berdasarkan wacana 1 di atas, apa sifat utama pedagang? | Jujur | Kikir | Ragu | Cemas | A'],
    ['Contoh PG mandiri', '2 | | Hitung \\(2x + 3 = 11\\) | 3 | 4 | 5 | 6 | B'],
    ['Contoh PG Kompleks', '3 | | Pilihlah bilangan prima di bawah ini! | 2 | 4 | 5 | 9 | A, C'],
    ['Contoh essay terhubung', '1 | 1 | Jelaskan keteladanan yang dapat dipetik dari kisah pedagang di atas! | Menjelaskan hikmah kejujuran.'],
    ['Contoh essay mandiri', '2 | | Jelaskan \\[E_k = \\frac{1}{2}mv^2\\] | Menuliskan rumus energi kinetik dan menjelaskan setiap variabel.'],
    ['Bobot nilai (opsional)', 'Jika perlu, tambahkan kolom Bobot nilai. Nilainya harus angka lebih besar dari 0; jika kolom atau sel dikosongkan, bobot otomatis menjadi 1.'],
    ['Rumus sebaris', 'Ketik rumus sebagai teks LaTeX dengan pembatas \\( dan \\). Contoh: Hitung \\(2x + 3 = 11\\). Rumus boleh ada di pertanyaan, opsi, wacana, atau rubrik.'],
    ['Rumus baris sendiri', 'Gunakan pembatas \\[ dan \\]. Contoh: \\[E_k = \\frac{1}{2}mv^2\\]. Pastikan pembuka dan penutup rumus lengkap.'],
    ['Bahasa dan gambar', 'Teks Indonesia, Arab, Inggris, dan mata pelajaran lain dapat digunakan. Gambar tidak diimpor dari Excel. Setelah menyimpan bank, buka Lihat soal lalu Tambah gambar pada soal atau wacana terkait.'],
    ['Sebelum menyimpan', 'Aplikasi memeriksa isi dan menampilkan pratinjau. Periksa kembali teks, wacana, rumus, opsi, kunci, rubrik, dan bobot sebelum menyimpan bank.'],
  ];
  const wacana = [
    WACANA_TEMPLATE_HEADERS,
    [1, 'Kisah Kejujuran Pedagang', 'Di sebuah pasar tua di Baghdad, hiduplah seorang pedagang yang selalu amanah dalam menimbang barang dagangannya...'],
  ];
  const pg = [
    PG_TEMPLATE_HEADERS,
    [1, 1, 'Berdasarkan wacana 1 di atas, apa sifat utama pedagang?', 'Jujur dan amanah', 'Kikir dan sombong', 'Pemarah', 'Pemberani', 'A'],
    [2, '', 'Hitung nilai \\(x\\) dari persamaan \\(2x + 3 = 11\\):', '3', '4', '5', '6', 'B'],
    [3, '', 'Pilihlah bilangan prima di bawah ini! (PG Kompleks)', '2', '4', '5', '9', 'A, C'],
  ];
  const essay = [
    ESSAY_TEMPLATE_HEADERS,
    [1, 1, 'Sebutkan hikmah yang dapat dipetik dari kisah pedagang pada wacana 1 di atas!', 'Menyebutkan keteladanan sifat jujur dan dampaknya bagi kehidupan sehari-hari.'],
    [2, '', 'Jelaskan konsep energi kinetik berdasarkan rumus \\[E_k = \\frac{1}{2}mv^2\\]!', 'Menuliskan rumus energi kinetik dan menjelaskan setiap variabel m (massa) dan v (kecepatan).'],
  ];
  const sheets = [
    { name: 'PETUNJUK', rows: guide, widths: [25, 112], options: { headerRow: 2, bodyRows: true, freezeRows: 2 } },
    { name: 'WACANA', rows: wacana, widths: [9, 32, 80], options: { headerRow: 1, freezeRows: 1, filter: true } },
    { name: 'PG', rows: pg, widths: [9, 12, 48, 28, 28, 28, 28, 21], options: { headerRow: 1, freezeRows: 1, filter: true, pg: true } },
    { name: 'ESSAY', rows: essay, widths: [9, 12, 58, 58], options: { headerRow: 1, freezeRows: 1, filter: true } },
  ];
  const contentTypes = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>' + sheets.map((_, index) => '<Override PartName=\"/xl/worksheets/sheet' + (index + 1) + '.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>').join('') + '</Types>';
  const relationships = sheets.map((_, index) => '<Relationship Id=\"rId' + (index + 1) + '\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet' + (index + 1) + '.xml\"/>').join('') + '<Relationship Id=\"rId' + (sheets.length + 1) + '\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>';
  const workbookSheets = sheets.map((sheet, index) => '<sheet name=\"' + sheet.name + '\" sheetId=\"' + (index + 1) + '\" r:id=\"rId' + (index + 1) + '\"/>').join('');
  const styles = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><color rgb=\"FFFFFFFF\"/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts><fills count=\"4\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF258A63\"/><bgColor indexed=\"64\"/></patternFill></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FFEAF6F1\"/><bgColor indexed=\"64\"/></patternFill></fill></fills><borders count=\"2\"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style=\"thin\"><color rgb=\"FFDCE7E0\"/></left><right style=\"thin\"><color rgb=\"FFDCE7E0\"/></right><top style=\"thin\"><color rgb=\"FFDCE7E0\"/></top><bottom style=\"thin\"><color rgb=\"FFDCE7E0\"/></bottom><diagonal/></border></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"3\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"1\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\" wrapText=\"1\"/></xf><xf numFmtId=\"0\" fontId=\"0\" fillId=\"3\" borderId=\"1\" xfId=\"0\" applyFill=\"1\" applyBorder=\"1\" applyAlignment=\"1\"><alignment vertical=\"top\" wrapText=\"1\"/></xf></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>';
  const files = {
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8('<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>' + workbookSheets + '</sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">' + relationships + '</Relationships>'),
    'xl/styles.xml': strToU8(styles),
  };
  sheets.forEach((sheet, index) => {
    files['xl/worksheets/sheet' + (index + 1) + '.xml'] = strToU8(worksheetXml(sheet.name, sheet.rows, sheet.widths, sheet.options));
  });
  return zipSync(files, { level: 6 });
}

export function downloadQuestionImportTemplate() {
  const workbook = buildQuestionImportTemplate();
  const url = URL.createObjectURL(new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template-import-soal-cbt-imbs.xlsx';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
