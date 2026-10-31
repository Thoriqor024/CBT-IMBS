import { useEffect, useState } from 'react';
import { BookMarked, BookOpen, CircleAlert, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from './api.js';
import { FormulaText } from './FormulaText.jsx';
import { QuestionImportPanel } from './QuestionImportPanel.jsx';
import { QuestionEditPanel } from './QuestionEditPanel.jsx';
import { StimulusManagerModal } from './StimulusManagerModal.jsx';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export function QuestionBankBuilder({ form, subjects, grades, questions, stimuli = [], error, onFormChange, onCountChange, onQuestionChange, onStimuliChange, onAddSubject, onImportQuestions }) {
  const mcCount = Number(form.mcCount);
  const essayCount = Number(form.essayCount);
  const countValid = form.mcCount !== '' && form.essayCount !== '' && Number.isInteger(mcCount) && Number.isInteger(essayCount) && mcCount >= 0 && essayCount >= 0 && mcCount + essayCount <= 1000;
  const selectedSubject = subjects.find(subject => String(subject.id) === String(form.subjectId));
  const isArabic = selectedSubject?.languageCode === 'ar';

  return <>
    <div className="question-subject-row"><label>Mata pelajaran<select value={form.subjectId} onChange={event => onFormChange({ subjectId: event.target.value })}>
      <option value="">Pilih mata pelajaran</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
    </select></label>{onAddSubject && <button type="button" className="secondary" onClick={onAddSubject}><Plus size={14}/> Mata pelajaran</button>}</div>
    {selectedSubject && <p className="subject-language-note">Bahasa soal: {selectedSubject.languageCode || 'id'} · Arah teks: {selectedSubject.textDirection || 'auto'}{isArabic ? ' · Keyboard Arab tersedia untuk jawaban essay' : ''}</p>}
    <div className="question-bank-meta-grid">
      <label>Topik / materi<input dir="auto" value={form.topic} onChange={event => onFormChange({ topic: event.target.value })} placeholder="Contoh: Bab 1 atau الفصل الدراسي الأول"/></label>
      <label>Kelas<select value={form.grade} onChange={event => onFormChange({ grade: event.target.value })}>{grades.map(grade => <option key={grade}>{grade}</option>)}</select></label>
    </div>

    <QuestionImportPanel ready={Boolean(form.subjectId && form.topic.trim())} onApply={onImportQuestions}/>

    <section className="question-builder-section" style={{ marginBottom: '1rem' }}>
      <div className="question-builder-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={16} />
          <h3>Wacana / Cerita Pendukung (Stimulus)</h3>
          <span>{stimuli.length} wacana</span>
        </div>
        {onStimuliChange && (
          <button
            type="button"
            className="secondary"
            onClick={() => onStimuliChange([...stimuli, { title: '', content: '' }])}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.825rem' }}
          >
            <Plus size={13} /> Tambah wacana
          </button>
        )}
      </div>
      {stimuli.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.25rem 0 0.5rem' }}>
          Opsional. Buat wacana jika ada cerita, bacaan, atau data yang digunakan bersama oleh beberapa soal di bawah.
        </p>
      ) : (
        <div className="question-builder-list" style={{ marginTop: '0.5rem' }}>
          {stimuli.map((stim, sIdx) => (
            <article key={sIdx} className="question-builder-card" style={{ borderLeft: '3px solid #258a63' }}>
              <div className="question-builder-card-head">
                <b>Wacana {sIdx + 1}</b>
                <button
                  type="button"
                  className="remove-image-button"
                  onClick={() => onStimuliChange(stimuli.filter((_, idx) => idx !== sIdx))}
                  style={{ padding: '0.2rem 0.5rem' }}
                >
                  <Trash2 size={13} /> Hapus wacana
                </button>
              </div>
              <label>
                Judul wacana / cerita
                <input
                  dir="auto"
                  value={stim.title}
                  onChange={e => onStimuliChange(stimuli.map((item, idx) => idx === sIdx ? { ...item, title: e.target.value } : item))}
                  placeholder="Contoh: Kisah Kejujuran Pedagang di Baghdad"
                />
              </label>
              <label>
                Isi teks / cerita wacana
                <textarea
                  dir="auto"
                  rows="3"
                  value={stim.content}
                  onChange={e => onStimuliChange(stimuli.map((item, idx) => idx === sIdx ? { ...item, content: e.target.value } : item))}
                  placeholder="Tuliskan teks wacana atau cerita..."
                />
              </label>
              {hasFormula(stim.content) && (
                <div className="question-formula-preview">
                  <small>Pratinjau rumus wacana</small>
                  <FormulaText>{stim.content}</FormulaText>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>

    <div className="question-count-grid">
      <label>Jumlah soal PG<input type="number" min="0" max="1000" step="1" value={form.mcCount} onChange={event => onCountChange('mc', event.target.value)}/></label>
      <label>Jumlah soal essay<input type="number" min="0" max="1000" step="1" value={form.essayCount} onChange={event => onCountChange('essay', event.target.value)}/></label>
      <div className="question-count-summary"><b>{questions.mc.length} PG</b><span>+</span><b>{questions.essay.length} essay</b><small>form soal dibuat otomatis</small></div>
    </div>
    {!countValid && <div className="question-form-error" role="alert">Masukkan jumlah bulat dari 0 hingga total 1.000 soal.</div>}

    {questions.mc.length > 0 && <section className="question-builder-section"><div className="question-builder-heading"><h3>Pilihan ganda</h3><span>{questions.mc.length} soal</span></div><div className="question-builder-list">{questions.mc.map((question, index) => <BankQuestionEditor key={`mc-${index}`} type="mc" index={index} question={question} stimuli={stimuli} onChange={changes => onQuestionChange('mc', index, changes)}/>)}</div></section>}
    {questions.essay.length > 0 && <section className="question-builder-section"><div className="question-builder-heading"><h3>Essay</h3><span>{questions.essay.length} soal</span></div><div className="question-builder-list">{questions.essay.map((question, index) => <BankQuestionEditor key={`essay-${index}`} type="essay" index={index} question={question} stimuli={stimuli} onChange={changes => onQuestionChange('essay', index, changes)}/>)}</div></section>}
    {countValid && mcCount + essayCount === 0 && <div className="question-builder-empty">Tentukan jumlah PG atau essay agar form soal muncul.</div>}
    {error && <div className="question-form-error" role="alert"><CircleAlert size={14}/>{error}</div>}
    <div className="form-note"><BookMarked size={16}/><span>Gunakan <code>\( rumus \)</code> untuk rumus sebaris atau <code>\[ rumus \]</code> untuk rumus di baris sendiri. Lampirkan satu gambar hingga 3 MB per soal; deskripsi gambar wajib diisi.</span></div>
  </>;
}

function BankQuestionEditor({ type, index, question, stimuli = [], onChange }) {
  const isEssay = type === 'essay';
  const updateOption = (optionIndex, value) => onChange({ options: question.options.map((option, i) => i === optionIndex ? value : option) });
  const setImage = event => onChange({ imageFile: event.target.files?.[0] || null, imageAltText: '' });
  const removeImage = () => onChange({ imageFile: null, imageAltText: '' });
  return <article className="question-builder-card">
    <div className="question-builder-card-head"><b>{isEssay ? 'Essay' : 'PG'} {index + 1}</b><span>{isEssay ? 'Pertanyaan dan rubrik' : 'Pertanyaan, opsi, dan kunci'}</span></div>
    <label>Pertanyaan<textarea dir="auto" rows="2" value={question.prompt} onChange={event => onChange({ prompt: event.target.value })} placeholder="Tulis pertanyaan; LaTeX: \(x^2\)"/></label>
    {hasFormula(question.prompt) && <div className="question-formula-preview"><small>Pratinjau rumus</small><FormulaText>{question.prompt}</FormulaText></div>}
    {stimuli && stimuli.length > 0 && (
      <label>
        Hubungkan ke wacana (opsional)
        <select
          value={question.stimulusIndex !== null && question.stimulusIndex !== undefined ? question.stimulusIndex : ''}
          onChange={event => onChange({ stimulusIndex: event.target.value === '' ? null : Number(event.target.value) })}
        >
          <option value="">Tanpa wacana (soal berdiri sendiri)</option>
          {stimuli.map((stim, sIdx) => (
            <option key={sIdx} value={sIdx}>
              Wacana {sIdx + 1}: {stim.title || '(Tanpa judul)'}
            </option>
          ))}
        </select>
      </label>
    )}
    <label className="question-image-picker">Gambar pendukung (opsional)<span><ImagePlus size={14}/> {question.imageFile?.name || 'Pilih gambar JPG, PNG, atau WebP'}</span><input type="file" accept={IMAGE_ACCEPT} onChange={setImage}/></label>
    {question.imageFile && <><label>Deskripsi gambar<input maxLength="500" value={question.imageAltText || ''} onChange={event => onChange({ imageAltText: event.target.value })} placeholder="Jelaskan isi gambar untuk aksesibilitas"/></label><button type="button" className="remove-image-button" onClick={removeImage}><Trash2 size={13}/> Hapus pilihan gambar</button></>}
    {isEssay ? <label>Rubrik / panduan koreksi<textarea dir="auto" rows="3" value={question.rubric} onChange={event => onChange({ rubric: event.target.value })} placeholder="Jelaskan unsur jawaban yang dinilai"/></label> : <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '4px 0 8px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={question.type === 'complex_mc'}
            onChange={e => onChange({ type: e.target.checked ? 'complex_mc' : 'mc', answerKey: '' })}
          />
          <b>Pilihan Ganda Kompleks (jawaban benar lebih dari 1)</b>
        </label>
      </div>
      <div className="question-option-grid">{question.options.map((option, optionIndex) => <label key={optionIndex}>Opsi {String.fromCharCode(65 + optionIndex)}<input dir="auto" value={option} onChange={event => updateOption(optionIndex, event.target.value)} placeholder={`Isi opsi ${String.fromCharCode(65 + optionIndex)}`}/></label>)}</div>
      {question.type === 'complex_mc' ? (
        <div style={{ margin: '8px 0' }}>
          <small style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Kunci jawaban benar (centang opsi yang benar):</small>
          <div style={{ display: 'flex', gap: 16 }}>
            {['A', 'B', 'C', 'D'].map((key, optionIndex) => {
              const currentKeys = question.answerKey ? question.answerKey.split(',').map(s => s.trim()) : [];
              const isChecked = currentKeys.includes(key);
              return (
                <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!question.options[optionIndex]?.trim()}
                    onChange={e => {
                      const nextKeys = e.target.checked ? [...currentKeys, key] : currentKeys.filter(k => k !== key);
                      nextKeys.sort();
                      onChange({ answerKey: nextKeys.join(',') });
                    }}
                  />
                  <span>Opsi {key}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <label>Kunci jawaban<select value={question.answerKey} onChange={event => onChange({ answerKey: event.target.value })}><option value="">Pilih kunci</option>{['A', 'B', 'C', 'D'].map((key, optionIndex) => <option key={key} value={key} disabled={!question.options[optionIndex].trim()}>{key}</option>)}</select></label>
      )}
    </>}
    <label className="question-points">Bobot nilai<input type="number" min="0.01" step="0.01" value={question.points} onChange={event => onChange({ points: event.target.value })}/></label>
  </article>;
}

export function QuestionList({ bank, questions, onAdd, onUploadMedia, onDeleteMedia }) {
  const [visibleQuestions, setVisibleQuestions] = useState(questions);
  const [stimuli, setStimuli] = useState([]);
  const [managingStimuli, setManagingStimuli] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [editError, setEditError] = useState('');
  const mcCount = questions.filter(question => ['mc', 'complex_mc'].includes(question.type)).length;
  const essayCount = questions.filter(question => question.type === 'essay').length;
  const locked = Number(bank?.examCount) > 0;

  useEffect(() => setVisibleQuestions(questions), [questions]);

  const loadStimuli = async () => {
    if (!bank?.id) return;
    try {
      const data = await api('/banks/' + bank.id + '/stimuli');
      setStimuli(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStimuli();
  }, [bank?.id]);

  const saveQuestionEdit = async (payload, imageFile, imageAltText) => {
    setSavingQuestion(true);
    setEditError('');
    try {
      await api('/questions/' + editingQuestion.id, { method: 'PUT', body: JSON.stringify(payload) });
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('altText', imageAltText.trim());
        await api('/questions/' + editingQuestion.id + '/media', { method: 'POST', body: formData });
      }
      const updated = await api('/banks/' + bank.id + '/questions');
      setVisibleQuestions(updated);
      setEditingQuestion(null);
      await loadStimuli();
    } catch (error) {
      setEditError(error.message || 'Perubahan soal tidak dapat disimpan.');
    } finally {
      setSavingQuestion(false);
    }
  };

  return <>
    <div className="question-summary">
      <span>{questions.length} soal · {mcCount} PG · {essayCount} essay{stimuli.length ? ` · ${stimuli.length} wacana` : ''}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="secondary" onClick={() => setManagingStimuli(true)}>
          <BookOpen size={14} /> Kelola Wacana ({stimuli.length})
        </button>
        <button className="primary" onClick={onAdd}>Tambah soal</button>
      </div>
    </div>
    <div className="question-list">{visibleQuestions.map((question, index) => {
      const stimulusTitle = question.stimulusTitle || stimuli.find(s => s.id === question.stimulusId)?.title;
      return <article key={question.id || index}>
        <div>
          <span className="question-type">{question.type === 'complex_mc' ? 'PG KOMPLEKS' : question.type === 'essay' ? 'ESSAY' : 'PG'}</span>
          {stimulusTitle && <span className="question-stimulus-badge" title="Terhubung ke cerita/wacana"><BookOpen size={11} /> {stimulusTitle}</span>}
          <b>{formatPoints(question.points)} poin</b>
          <button type="button" className="row-action" title={locked ? 'Bank sudah memiliki ujian' : 'Edit soal'} aria-label={'Edit soal ' + (index + 1)} disabled={locked} onClick={() => { setEditError(''); setEditingQuestion(question); }}><Pencil size={14}/></button>
        </div>
        <p dir="auto"><FormulaText>{question.prompt}</FormulaText></p>
        <QuestionImageActions question={question} locked={locked} onUpload={onUploadMedia} onDelete={onDeleteMedia}/>
        {['mc', 'complex_mc'].includes(question.type) && <ol type="A">{(question.options || []).map((option, optionIndex) => <li key={optionIndex} dir="auto"><FormulaText>{option}</FormulaText></li>)}</ol>}
        <small>{question.type === 'essay' ? 'Rubrik / panduan: ' : 'Kunci: '}{question.answerKey || 'Belum diisi'} · Bank {bank?.topic}</small>
      </article>;
    })}{!visibleQuestions.length && <div className="question-builder-empty">Bank ini belum memiliki soal. Tambahkan soal untuk mulai menggunakannya.</div>}</div>
    {editingQuestion && <QuestionEditPanel question={editingQuestion} stimuli={stimuli} locked={locked} busy={savingQuestion} error={editError} onCancel={() => { setEditingQuestion(null); setEditError(''); }} onSave={saveQuestionEdit}/>}
    {managingStimuli && <StimulusManagerModal bank={bank} locked={locked} onClose={() => setManagingStimuli(false)} onStimuliUpdated={setStimuli} />}
  </>;
}

function QuestionImageActions({ question, locked, onUpload, onDelete }) {
  const [altText, setAltText] = useState('');
  const media = question.media?.[0];
  return <div className="question-media-management">
    {media ? <><img className="question-media-preview" src={media.url} alt={media.altText}/><div><small>{media.altText}</small>{locked ? <small>Gambar dikunci karena bank sudah dijadwalkan.</small> : <button type="button" className="remove-image-button" onClick={() => onDelete(media.id, question.id)}><Trash2 size={13}/> Hapus gambar</button>}</div></> : locked ? <small>Gambar hanya dapat ditambahkan sebelum bank dijadwalkan.</small> : <>
      <label>Deskripsi gambar<input maxLength="500" value={altText} onChange={event => setAltText(event.target.value)} placeholder="Jelaskan isi gambar"/></label>
      <label className="question-image-picker"><span><ImagePlus size={14}/> Tambah gambar</span><input type="file" accept={IMAGE_ACCEPT} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(question.id, file, altText); event.target.value = ''; }}/></label>
    </>}
  </div>;
}

function hasFormula(text) { return /\\\(|\\\[/.test(text || ''); }
function formatPoints(value) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number(value) || 0); }
