const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function normalizeIdempotencyKey(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const key = String(value).trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw Object.assign(
      new Error('Idempotency-Key harus 8–128 karakter berupa huruf, angka, titik, titik dua, garis, atau garis bawah.'),
      { status: 400 }
    );
  }
  return key;
}
