-- Pengecualian lama bisa terbentuk saat form akses belum memuat daftar bank.
-- Bersihkan sekali, lalu bangun ulang tautan otomatis dari akses mapel/tingkat.
DELETE FROM question_bank_teachers WHERE source = 'excluded';

INSERT INTO question_bank_teachers(bank_id, teacher_id, source)
SELECT DISTINCT b.id, ta.teacher_id, 'auto'
FROM question_banks b
JOIN teacher_access ta ON ta.subject_id = b.subject_id
JOIN users u ON u.id = ta.teacher_id AND u.role = 'teacher'
WHERE left(ta.class_name, length(b.grade)) = b.grade
  AND (length(ta.class_name) = length(b.grade)
    OR substring(ta.class_name, length(b.grade) + 1, 1) IN (' ', '-'))
ON CONFLICT (bank_id, teacher_id) DO NOTHING;
