import { useState } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { FormulaText } from './FormulaText.jsx';
import { downloadQuestionImportTemplate, validateQuestionImportSheets } from './questionImportFormat.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function QuestionImportPanel({ ready, onApply }) {
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [draft, setDraft] = useState(null);
  const [issues, setIssues] = useState([]);
  const [message, setMessage] = useState('');

  const readWorkbook = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ready) {
      setIssues(['Pilih mata pelajaran dan isi topik/materi sebelum mengimpor soal.']);
      return;
    }
    setFileName(file.name);
    setDraft(null);
    setIssues([]);
    setMessage('');
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setIssues(['Pilih file Excel .xlsx. File CSV, PDF, dan .xls tidak didukung untuk import soal.']);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setIssues(['Ukuran file maksimal 10 MB. Hapus isi atau gambar yang tidak diperlukan lalu simpan kembali sebagai .xlsx.']);
      return;
    }
    setBusy(true);
    try {
      const sheets = await readXlsxFile(file);
      const result = validateQuestionImportSheets(sheets);
      if (result.errors.length) setIssues(result.errors);
      else setDraft(result);
    } catch (error) {
      setIssues([error?.message ? 'File Excel tidak dapat dibaca: ' + error.message : 'File Excel tidak dapat dibaca. Unduh ulang template dan coba lagi.']);
    } finally {
      setBusy(false);
    }
  };

  const applyDraft = () => {
    if (!draft) return;
    const applied = onApply(draft);
    if (applied === false) return;
    setMessage(draft.mc.length + ' soal PG dan ' + draft.essay.length + ' soal essay' + (draft.stimuli?.length ? ' serta ' + draft.stimuli.length + ' wacana' : '') + ' dimuat ke form. Periksa kembali semua butir sebelum menyimpan.');
    setDraft(null);
    setIssues([]);
  };

  return <section className="question-import-panel" aria-label="Import soal Excel">
    <div className="question-import-head">
      <div><span className="question-import-icon"><FileSpreadsheet size={16}/></span><div><h3>Import dari Excel</h3><p>Satu workbook untuk satu bank. Pilih mata pelajaran, topik, dan kelas di atas.</p></div></div>
      <button type="button" className="secondary question-template-button" onClick={downloadQuestionImportTemplate}><Download size={14}/> Unduh template</button>
    </div>
    <div className="question-import-actions">
      <label className={'upload-button' + (!ready ? ' is-disabled' : '')}><Upload size={14}/> {busy ? 'Membaca file…' : 'Pilih file .xlsx'}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy || !ready} onChange={readWorkbook}/></label>
      <small>{ready ? 'Gambar tidak dibaca dari Excel. Setelah bank disimpan, tambahkan melalui Lihat soal.' : 'Pilih mata pelajaran dan isi topik/materi sebelum mengimpor soal.'}</small>
    </div>
    {issues.length > 0 && <div className="question-import-errors" role="alert">
      <b>{fileName ? 'Perbaiki file ' + fileName + ' lalu unggah kembali:' : 'File belum dapat diimpor:'}</b>
      <ul>{issues.slice(0, 20).map((issue, index) => <li key={index}>{issue}</li>)}</ul>
      {issues.length > 20 && <small>Dan {issues.length - 20} kesalahan lainnya.</small>}
      <small>Tidak ada soal yang dimuat ke form.</small>
    </div>}
    {draft && <div className="question-import-result">
      <div className="question-import-count"><b>{fileName}</b><span>{draft.mc.length} PG + {draft.essay.length} essay{draft.stimuli?.length ? ' + ' + draft.stimuli.length + ' wacana' : ''} · {draft.mc.length + draft.essay.length} soal</span></div>
      {draft.stimuli?.length > 0 && <div className="question-import-stimuli-preview" style={{ margin: '0.5rem 0', padding: '0.5rem', background: '#eaf6f1', borderRadius: '4px', borderLeft: '3px solid #258a63' }}>
        <b>{draft.stimuli.length} Wacana / Stimulus terdeteksi:</b>
        <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
          {draft.stimuli.slice(0, 3).map((stim, sIdx) => (
            <li key={sIdx}><small><b>Wacana {sIdx + 1}:</b> {stim.title} {stim.content ? `— ${stim.content.slice(0, 60)}...` : ''}</small></li>
          ))}
        </ul>
        {draft.stimuli.length > 3 && <small style={{ color: '#6b7280' }}>Dan {draft.stimuli.length - 3} wacana lainnya.</small>}
      </div>}
      <div className="question-import-preview">
        {draft.mc.slice(0, 3).map((question, index) => <article key={'mc-' + index}>
          <b>Pratinjau PG {index + 1} · Kunci {question.answerKey} · {question.points} poin</b>
          <p dir="auto"><FormulaText>{question.prompt}</FormulaText></p>
          <ol type="A">{question.options.map((option, optionIndex) => <li key={optionIndex} dir="auto"><FormulaText>{option}</FormulaText></li>)}</ol>
        </article>)}
        {draft.essay.slice(0, 3).map((question, index) => <article key={'essay-' + index}>
          <b>Pratinjau essay {index + 1} · {question.points} poin</b>
          <p dir="auto"><FormulaText>{question.prompt}</FormulaText></p>
          <small>Rubrik: <FormulaText>{question.rubric}</FormulaText></small>
        </article>)}
        {draft.mc.length > 3 && <small>{draft.mc.length - 3} soal PG lainnya akan dimuat ke form.</small>}
        {draft.essay.length > 3 && <small>{draft.essay.length - 3} soal essay lainnya akan dimuat ke form.</small>}
      </div>
      <button type="button" className="primary question-import-apply" onClick={applyDraft}>Gunakan hasil pratinjau</button>
    </div>}
    {message && <div className="question-import-success" role="status">{message} Gambar dapat ditambahkan dari daftar soal setelah bank tersimpan.</div>}
  </section>;
}
