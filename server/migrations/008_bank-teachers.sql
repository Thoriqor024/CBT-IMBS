CREATE TABLE IF NOT EXISTS question_bank_teachers (
  bank_id BIGINT NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual','excluded')),
  PRIMARY KEY (bank_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_question_bank_teachers_teacher ON question_bank_teachers(teacher_id);

-- Bank yang sudah ada dihubungkan ke guru yang akses mapel dan tingkatnya cocok.
INSERT INTO question_bank_teachers(bank_id, teacher_id, source)
SELECT DISTINCT b.id, ta.teacher_id, 'auto'
FROM question_banks b
JOIN teacher_access ta ON ta.subject_id = b.subject_id
JOIN users u ON u.id = ta.teacher_id AND u.role = 'teacher'
WHERE left(ta.class_name, length(b.grade)) = b.grade
  AND (length(ta.class_name) = length(b.grade)
    OR substring(ta.class_name, length(b.grade) + 1, 1) IN (' ', '-'))
ON CONFLICT (bank_id, teacher_id) DO NOTHING;

-- Bank yang dibuat guru tetap terhubung ke pembuatnya.
INSERT INTO question_bank_teachers(bank_id, teacher_id, source)
SELECT b.id, b.created_by, 'manual'
FROM question_banks b
JOIN users u ON u.id = b.created_by AND u.role = 'teacher'
ON CONFLICT (bank_id, teacher_id) DO UPDATE SET source = 'manual';
