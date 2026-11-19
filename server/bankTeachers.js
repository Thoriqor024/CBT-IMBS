const gradePrefix = grade => `left(ta.class_name,length(${grade}))=${grade}
  AND (length(ta.class_name)=length(${grade}) OR substring(ta.class_name,length(${grade})+1,1) IN (' ','-'))`;

export function gradeMatchesClass(grade, className) {
  const normalizedGrade = String(grade || '').trim();
  const normalizedClass = String(className || '').trim().replace(/^(kelas|kls|class)\s*[-:]?\s*/i, '');
  if (!normalizedGrade || !normalizedClass) return false;
  return normalizedClass === normalizedGrade
    || normalizedClass.startsWith(normalizedGrade + ' ')
    || normalizedClass.startsWith(normalizedGrade + '-');
}

// Hubungkan bank baru ke semua guru yang mengampu mapel dan tingkat yang sama.
export async function syncBankTeachers(client, bankId) {
  await client.query(`INSERT INTO question_bank_teachers(bank_id,teacher_id,source)
    SELECT $1,ta.teacher_id,'auto'
    FROM question_banks b
    JOIN teacher_access ta ON ta.subject_id=b.subject_id
    JOIN users u ON u.id=ta.teacher_id AND u.role='teacher' AND u.active=TRUE
    WHERE b.id=$1 AND ${gradePrefix('b.grade')}
    ON CONFLICT (bank_id,teacher_id) DO NOTHING`, [bankId]);
}

// Sinkronkan tautan otomatis guru setelah kelas/mapel aksesnya berubah.
export async function syncTeacherBanks(client, teacherId) {
  await client.query(`DELETE FROM question_bank_teachers qbt
    WHERE qbt.teacher_id=$1 AND qbt.source='auto'
      AND NOT EXISTS(
        SELECT 1 FROM question_banks b
        JOIN teacher_access ta ON ta.subject_id=b.subject_id
        WHERE b.id=qbt.bank_id AND ta.teacher_id=$1 AND ${gradePrefix('b.grade')}
      )`, [teacherId]);
  await client.query(`INSERT INTO question_bank_teachers(bank_id,teacher_id,source)
    SELECT DISTINCT b.id,$1::bigint,'auto'
    FROM question_banks b
    JOIN teacher_access ta ON ta.subject_id=b.subject_id
    WHERE ta.teacher_id=$1::bigint AND ${gradePrefix('b.grade')}
    ON CONFLICT (bank_id,teacher_id) DO NOTHING`, [teacherId]);
}

// Pilihan manual dari form akses guru. Tautan yang sudah ada tetap mempertahankan
// sumbernya agar simpan akses tidak mengubah tautan otomatis menjadi manual.
export async function applyTeacherBankSelection(client, teacherId, bankIds) {
  const selected = Array.isArray(bankIds) ? [...new Set(bankIds.map(Number).filter(Number.isSafeInteger))] : [];
  await client.query(`UPDATE question_bank_teachers SET source='excluded'
    WHERE teacher_id=$1 AND NOT (bank_id=ANY($2::bigint[]))`, [teacherId, selected]);
  if (!selected.length) return;
  await client.query(`INSERT INTO question_bank_teachers(bank_id,teacher_id,source)
    SELECT unnest($2::bigint[]),$1::bigint,'manual'
    ON CONFLICT (bank_id,teacher_id) DO NOTHING`, [teacherId, selected]);
  await client.query(`UPDATE question_bank_teachers qbt SET source=CASE WHEN EXISTS(
      SELECT 1 FROM question_banks b JOIN teacher_access ta ON ta.subject_id=b.subject_id
      WHERE b.id=qbt.bank_id AND ta.teacher_id=qbt.teacher_id AND ${gradePrefix('b.grade')}
    ) THEN 'auto' ELSE 'manual' END
    WHERE qbt.teacher_id=$1::bigint AND qbt.bank_id=ANY($2::bigint[]) AND qbt.source='excluded'`, [teacherId, selected]);
}
