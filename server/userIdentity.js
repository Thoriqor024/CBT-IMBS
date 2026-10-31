export function normalizeAccountEmail(value, { required = false } = {}) {
  const email = String(value ?? '').trim().toLowerCase();
  if (!email && !required) return null;
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('Email wajib valid dan maksimal 254 karakter.'), { status: 400 });
  }
  return email;
}