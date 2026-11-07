import { useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import { FormulaText } from './FormulaText.jsx';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

export function QuestionEditPanel({ question, stimuli = [], locked, busy, error: saveError, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    type: question.type,
    prompt: question.prompt || '',
    options: ['mc', 'complex_mc'].includes(question.type) ? [...(question.options || ['', '', '', ''])] : [],
    answerKey: question.answerKey || '',
    points: String(question.points ?? 1),
    stimulusId: question.stimulusId ?? null,
  }));
  const [imageFile, setImageFile] = useState(null);
  const [imageAltText, setImageAltText] = useState('');
  const [error, setError] = useState('');
  const existingImage = question.media?.[0];
  const update = changes => setForm(current => ({ ...current, ...changes }));

  const save = async event => {
    event.preventDefault();
    setError('');
    if (locked) {
      setError('Soal pada bank yang sudah memiliki ujian tidak dapat diubah.');
      return;
    }
    if (!form.prompt.trim()) {
      setError('Pertanyaan wajib diisi.');
      return;
    }
    if (form.type === 'mc' && (form.options.some(option => !option.trim())
      || !['A', 'B', 'C', 'D'].includes(form.answerKey)
      || !form.options['ABCD'.indexOf(form.answerKey)]?.trim())) {
      setError('Lengkapi opsi A sampai D dan pilih kunci jawaban yang terisi.');
      return;
    }
    if (form.type === 'complex_mc') {
      const keys = form.answerKey ? form.answerKey.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (form.options.some(option => !option.trim()) || keys.length === 0 || keys.some(k => !form.options['ABCD'.indexOf(k)]?.trim())) {
        setError('Lengkapi opsi A sampai D dan pilih minimal satu kunci jawaban yang terisi.');
        return;
      }
    }
    if (form.type === 'essay' && !form.answerKey.trim()) {
      setError('Rubrik atau panduan koreksi wajib diisi.');
      return;
    }
    if (!Number.isFinite(Number(form.points)) || Number(form.points) <= 0) {
      setError('Bobot harus berupa angka lebih besar dari 0.');
      return;
    }
    if (imageFile && (!IMAGE_TYPES.has(imageFile.type) || imageFile.size > MAX_IMAGE_SIZE || !imageAltText.trim())) {
      setError('Gambar harus JPG, PNG, atau WebP maksimal 3 MB dan deskripsinya wajib diisi.');
      return;
    }
    await onSave({ ...form, prompt: form.prompt.trim(), answerKey: form.answerKey.trim() }, imageFile, imageAltText);
  };

  const isMCGroup = ['mc', 'complex_mc'].includes(form.type);
  const currentComplexKeys = form.type === 'complex_mc' && form.answerKey ? form.answerKey.split(',').map(s => s.trim()).filter(Boolean) : [];

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !busy && onCancel()}>
    <section className="modal question-edit-modal" role="dialog" aria-modal="true" aria-labelledby="question-edit-title">
      <div className="modal-head"><div><div className="eyebrow">EDIT BUTIR SOAL</div><h2 id="question-edit-title">{form.type === 'complex_mc' ? 'Pilihan ganda kompleks' : form.type === 'mc' ? 'Pilihan ganda' : 'Essay'}</h2></div></div>
      <form className="question-edit-panel" onSubmit={save}>
    <div className="question-edit-kind">{form.type === 'complex_mc' ? 'Soal PG kompleks' : form.type === 'mc' ? 'Soal pilihan ganda' : 'Soal essay'} · {Number(form.points) || 0} poin</div>
    {stimuli.length > 0 && <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
      Cerita / Wacana terkait (opsional)
      <select value={form.stimulusId ?? ''} onChange={event => update({ stimulusId: event.target.value ? Number(event.target.value) : null })}>
        <option value="">-- Tanpa Wacana (Soal Mandiri) --</option>
        {stimuli.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select>
    </label>}
    <label>Pertanyaan<textarea dir="auto" rows="3" value={form.prompt} onChange={event => update({ prompt: event.target.value })} placeholder="Tulis pertanyaan; rumus LaTeX: \\(x^2\\)"/></label>
    <div className="question-formula-preview"><small>Pratinjau pertanyaan</small><FormulaText>{form.prompt}</FormulaText></div>
    {isMCGroup ? <>
      <div className="question-option-grid">{form.options.map((option, index) => <label key={index}><span className="option-letter">{String.fromCharCode(65 + index)}</span><input dir="auto" value={option} onChange={event => update({ options: form.options.map((value, optionIndex) => optionIndex === index ? event.target.value : value) })}/></label>)}</div>
      {form.type === 'complex_mc' ? (
        <div className="complex-mc-keys">
          <small>Kunci jawaban benar (pilih opsi yang merupakan kunci):</small>
          <div className="complex-keys-grid">
            {['A', 'B', 'C', 'D'].map((key, optIdx) => {
              const checked = currentComplexKeys.includes(key);
              const disabled = !form.options[optIdx]?.trim();
              return (
                <label key={key} className={`complex-key-item${disabled ? ' disabled' : ''}${checked ? ' selected checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={e => {
                      const nextKeys = e.target.checked ? [...currentComplexKeys, key] : currentComplexKeys.filter(k => k !== key);
                      nextKeys.sort();
                      update({ answerKey: nextKeys.join(',') });
                    }}
                  />
                  <div className="key-badge">{key}</div>
                  <div className="key-info">
                    <span className="key-text">Opsi {key}</span>
                    <small className="key-sub">{disabled ? 'Isi opsi dulu' : checked ? 'Kunci Benar' : 'Bukan Kunci'}</small>
                  </div>
                  {checked && <span className="key-check">✓</span>}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <label>Kunci jawaban<select value={form.answerKey} onChange={event => update({ answerKey: event.target.value })}><option value="">Pilih kunci</option>{['A', 'B', 'C', 'D'].map(key => <option key={key}>{key}</option>)}</select></label>
      )}
    </> : <>
      <label>Rubrik / panduan koreksi<textarea dir="auto" rows="3" value={form.answerKey} onChange={event => update({ answerKey: event.target.value })} placeholder="Jelaskan unsur jawaban yang dinilai"/></label>
      <div className="question-formula-preview"><small>Pratinjau rubrik</small><FormulaText>{form.answerKey}</FormulaText></div>
    </>}
    <label className="question-points">Bobot nilai<input type="number" min="0.01" step="0.01" value={form.points} onChange={event => update({ points: event.target.value })}/></label>
    {existingImage ? <div className="question-edit-image"><img className="question-media-preview" src={existingImage.url} alt={existingImage.altText}/><small>Gambar saat ini. Penggantian gambar tersedia dari daftar soal.</small></div> : <>
      <label className="question-image-picker"><span><ImagePlus size={14}/> {imageFile?.name || 'Tambah gambar (opsional)'}</span><input type="file" disabled={locked} accept="image/jpeg,image/png,image/webp" onChange={event => { setImageFile(event.target.files?.[0] || null); setImageAltText(''); }}/></label>
      {imageFile && <label>Deskripsi gambar<input maxLength="500" value={imageAltText} onChange={event => setImageAltText(event.target.value)} placeholder="Jelaskan isi gambar"/></label>}
    </>}
    {locked && <div className="question-form-error" role="alert">Bank ini sudah memiliki ujian. Soal dikunci agar isi sesi ujian tetap konsisten.</div>}
    {saveError && <div className="question-form-error" role="alert">{saveError}</div>}
    {error && <div className="question-form-error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Batal</button><button type="submit" className="primary" disabled={busy || locked}><Save size={15}/>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>
      </form>
    </section>
  </div>;
}
