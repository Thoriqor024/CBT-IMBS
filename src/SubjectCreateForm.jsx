import { useState, useEffect } from 'react';

export default function SubjectCreateForm({ initialData, onSave, onCancel, busy }) {
  const [name, setName] = useState(initialData?.name || '');
  const [languageCode, setLanguageCode] = useState(initialData?.languageCode || 'id');
  const [textDirection, setTextDirection] = useState(initialData?.textDirection || 'auto');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setLanguageCode(initialData.languageCode || 'id');
      setTextDirection(initialData.textDirection || 'auto');
    }
  }, [initialData]);

  const changeLanguage = value => {
    setLanguageCode(value);
    setTextDirection(value === 'ar' ? 'rtl' : 'auto');
  };

  return <>
    <label>Nama mata pelajaran<input autoFocus maxLength="100" value={name} onChange={event => setName(event.target.value)} placeholder="Contoh: Fisika"/></label>
    <label>Bahasa soal<select value={languageCode} onChange={event => changeLanguage(event.target.value)}>
      <option value="id">Bahasa Indonesia (id)</option><option value="ar">Bahasa Arab (ar)</option><option value="en">Bahasa Inggris (en)</option>
    </select></label>
    <label>Arah teks<select value={textDirection} onChange={event => setTextDirection(event.target.value)}>
      <option value="auto">Otomatis per teks</option><option value="ltr">Kiri ke kanan</option><option value="rtl">Kanan ke kiri</option>
    </select></label>
    <div className="form-note">Bahasa dan arah teks dipakai di halaman ujian. Teks antarmuka pengelola tetap berbahasa Indonesia.</div>
    <div className="modal-actions"><button className="secondary" onClick={onCancel}>Batal</button><button className="primary" disabled={busy || !name.trim()} onClick={() => onSave({ ...(initialData ? { id: initialData.id } : {}), name, languageCode, textDirection })}>{busy ? 'Menyimpan…' : (initialData ? 'Perbarui mata pelajaran' : 'Simpan mata pelajaran')}</button></div>
  </>;
}
