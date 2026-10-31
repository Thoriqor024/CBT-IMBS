import { useEffect, useState } from 'react';
import { BookOpen, CircleAlert, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from './api.js';
import { FormulaText } from './FormulaText.jsx';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

export function StimulusManagerModal({ bank, locked, onClose, onStimuliUpdated }) {
  const [stimuli, setStimuli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null, 'new', or stimulus object
  const [form, setForm] = useState({ title: '', content: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imageAltText, setImageAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await api(`/banks/${bank.id}/stimuli`);
      setStimuli(data);
      if (onStimuliUpdated) onStimuliUpdated(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar wacana.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bank?.id) load();
  }, [bank?.id]);

  const startCreate = () => {
    setEditing('new');
    setForm({ title: '', content: '' });
    setImageFile(null);
    setImageAltText('');
    setError('');
  };

  const startEdit = (stimulus) => {
    setEditing(stimulus);
    setForm({ title: stimulus.title, content: stimulus.content });
    setImageFile(null);
    setImageAltText(stimulus.mediaAltText || '');
    setError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setError('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Judul wacana/cerita wajib diisi.');
      return;
    }
    if (imageFile && (!IMAGE_TYPES.has(imageFile.type) || imageFile.size > MAX_IMAGE_SIZE || !imageAltText.trim())) {
      setError('Gambar harus JPG, PNG, atau WebP maksimal 3 MB dan deskripsinya wajib diisi.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let stimulusId = editing?.id;
      if (editing === 'new') {
        const res = await api(`/banks/${bank.id}/stimuli`, {
          method: 'POST',
          body: JSON.stringify({ title: form.title.trim(), content: form.content.trim() }),
        });
        stimulusId = res.id;
      } else {
        await api(`/stimuli/${stimulusId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: form.title.trim(), content: form.content.trim() }),
        });
      }

      if (imageFile && stimulusId) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('altText', imageAltText.trim());
        await api(`/stimuli/${stimulusId}/media`, { method: 'POST', body: formData });
      }

      await load();
      setEditing(null);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan wacana.');
    } finally {
      setBusy(false);
    }
  };

  const removeStimulus = async (stimulus) => {
    if (!window.confirm(`Hapus wacana "${stimulus.title}"? Soal-soal yang terhubung akan berubah menjadi soal mandiri.`)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/stimuli/${stimulus.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message || 'Gagal menghapus wacana.');
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async (stimulusId) => {
    if (!window.confirm('Hapus gambar dari wacana ini?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/stimuli/${stimulusId}/media`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message || 'Gagal menghapus gambar wacana.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && !busy && onClose()}>
      <section className="modal stimulus-manager-modal" role="dialog" aria-modal="true" style={{ width: 'min(640px, 100%)' }}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">STIMULUS & WACANA BERSAMA</div>
            <h2>Kelola Cerita / Wacana ({stimuli.length})</h2>
            <small style={{ color: '#8894a4' }}>Wacana dapat dihubungkan ke beberapa butir soal PG maupun Essay.</small>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        {error && <div className="portal-error" role="alert" style={{ marginBottom: 14 }}><CircleAlert size={15} />{error}</div>}

        {editing ? (
          <form onSubmit={save} className="stimulus-form">
            <h3 style={{ margin: '0 0 10px', fontSize: '13px', color: '#2a3b4e' }}>
              {editing === 'new' ? 'Tambah Cerita / Wacana Baru' : 'Edit Cerita / Wacana'}
            </h3>
            <label style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
              Judul Wacana / Cerita
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Contoh: Kisah Sahabat di Madinah atau Teks Bacaan 1"
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
              Isi Teks Cerita / Wacana
              <textarea
                dir="auto"
                rows="6"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Tuliskan cerita, paragraf narasi, atau artikel di sini..."
              />
            </label>
            {editing !== 'new' && editing.mediaUrl && !imageFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', padding: 8, background: '#f8fafc', borderRadius: 8 }}>
                <img src={editing.mediaUrl} alt={editing.mediaAltText} style={{ height: 48, borderRadius: 6, objectFit: 'cover' }} />
                <span style={{ fontSize: '11px', color: '#64748b', flex: 1 }}>{editing.mediaAltText || 'Gambar wacana saat ini'}</span>
                {!locked && (
                  <button type="button" className="teacher-delete-button" onClick={() => removeImage(editing.id)}>
                    <Trash2 size={12} /> Hapus gambar
                  </button>
                )}
              </div>
            )}
            <label className="question-image-picker" style={{ margin: '8px 0' }}>
              <span><ImagePlus size={14} /> {imageFile ? imageFile.name : 'Unggah gambar wacana (opsional)'}</span>
              <input
                type="file"
                disabled={locked}
                accept="image/jpeg,image/png,image/webp"
                onChange={e => { setImageFile(e.target.files?.[0] || null); setImageAltText(''); }}
              />
            </label>
            {imageFile && (
              <label style={{ display: 'grid', gap: 6, margin: '8px 0 12px' }}>
                Deskripsi gambar
                <input
                  value={imageAltText}
                  onChange={e => setImageAltText(e.target.value)}
                  placeholder="Jelaskan isi gambar untuk aksesibilitas"
                  required
                />
              </label>
            )}
            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="secondary" onClick={cancelEdit} disabled={busy}>Batal</button>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Menyimpan...' : 'Simpan Wacana'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {stimuli.length ? `Tersedia ${stimuli.length} wacana dalam bank ini.` : 'Belum ada wacana/cerita dalam bank ini.'}
              </span>
              {!locked && (
                <button className="primary" onClick={startCreate} style={{ fontSize: '11px', padding: '6px 12px' }}>
                  <Plus size={14} /> Tambah Wacana
                </button>
              )}
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'grid', gap: 10 }}>
              {stimuli.map(item => (
                <article key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BookOpen size={14} color="#258a63" />
                        <b style={{ fontSize: '13px', color: '#1e293b' }}>{item.title}</b>
                      </div>
                      <small style={{ color: '#64748b', display: 'block', marginTop: 3 }}>
                        Terhubung ke <b>{item.questionCount || 0}</b> soal
                      </small>
                    </div>
                    {!locked && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => startEdit(item)}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button type="button" className="teacher-delete-button" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => removeStimulus(item)}>
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                  {item.content && (
                    <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: '#475569', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.content}
                    </p>
                  )}
                  {item.mediaUrl && (
                    <div style={{ marginTop: 8 }}>
                      <img src={item.mediaUrl} alt={item.mediaAltText} style={{ height: 40, borderRadius: 4, objectFit: 'cover' }} />
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="secondary" onClick={onClose}>Tutup</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

