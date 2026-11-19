import { matchBankGrade } from './gradeMatching.js';

export { matchBankGrade };

// Menormalkan kuota per kelas dari form ruang ujian sebelum plotting.
export function normalizeRoomQuotas(rawQuotas, allowedClasses) {
  if (!Array.isArray(rawQuotas) || rawQuotas.length === 0) {
    throw Object.assign(new Error('Pilih minimal satu kelas dan isi kuota siswa.'), { status: 400 });
  }
  const allowed = new Set((allowedClasses || []).map(className => String(className).trim()).filter(Boolean));
  const seen = new Set();
  const quotas = [];
  for (const item of rawQuotas) {
    const className = String(item?.className ?? item?.class ?? '').trim();
    const count = Number(item?.count ?? item?.quota ?? 0);
    if (!className) throw Object.assign(new Error('Setiap kuota harus memiliki kelas.'), { status: 400 });
    if (!allowed.has(className)) throw Object.assign(new Error(`Kelas "${className}" tidak ada di Pengaturan sekolah.`), { status: 400 });
    if (seen.has(className)) throw Object.assign(new Error(`Kelas "${className}" dipilih lebih dari sekali.`), { status: 400 });
    if (!Number.isInteger(count) || count < 0 || count > 1000) {
      throw Object.assign(new Error(`Kuota kelas "${className}" harus bilangan bulat 0–1000.`), { status: 400 });
    }
    seen.add(className);
    quotas.push({ className, count });
  }
  if (!quotas.some(quota => quota.count > 0)) {
    throw Object.assign(new Error('Isi kuota minimal 1 siswa pada salah satu kelas.'), { status: 400 });
  }
  return quotas;
}
