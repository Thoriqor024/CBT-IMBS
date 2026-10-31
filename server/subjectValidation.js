export function validateSubjectInput({ name, languageCode = 'id', textDirection = 'auto' } = {}) {
  const trimmedName = String(name || '').trim();
  const normalizedLang = String(languageCode || 'id').trim().toLowerCase();
  const normalizedDir = String(textDirection || 'auto').trim().toLowerCase();

  if (!trimmedName || trimmedName.length > 100) {
    const err = new Error('Nama mata pelajaran wajib diisi dan maksimal 100 karakter.');
    err.status = 400;
    throw err;
  }
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalizedLang)) {
    const err = new Error('Kode bahasa tidak valid.');
    err.status = 400;
    throw err;
  }
  if (!['auto', 'ltr', 'rtl'].includes(normalizedDir)) {
    const err = new Error('Arah teks harus otomatis, LTR, atau RTL.');
    err.status = 400;
    throw err;
  }
  return { name: trimmedName, languageCode: normalizedLang, textDirection: normalizedDir };
}

