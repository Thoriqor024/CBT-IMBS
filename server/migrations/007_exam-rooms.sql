CREATE TABLE IF NOT EXISTS exam_rooms (
  id BIGSERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL,
  quotas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_room_students (
  room_id BIGINT NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  PRIMARY KEY(room_id, student_id), UNIQUE(student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_room_students_room ON exam_room_students(room_id);

CREATE TABLE IF NOT EXISTS exam_room_proctors (
  room_id BIGINT NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
  proctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(room_id, proctor_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_room_proctors_proctor ON exam_room_proctors(proctor_id);

CREATE TABLE IF NOT EXISTS exam_room_links (
  exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  room_id BIGINT NOT NULL REFERENCES exam_rooms(id) ON DELETE CASCADE,
  PRIMARY KEY(exam_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_room_links_room ON exam_room_links(room_id);

CREATE TABLE IF NOT EXISTS exam_subjects (
  exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,
  PRIMARY KEY(exam_id, subject_id)
);

ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS room_id BIGINT REFERENCES exam_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_exam_sessions_room ON exam_sessions(room_id);
