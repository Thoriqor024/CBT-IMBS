CREATE TABLE IF NOT EXISTS exam_proctors (
  exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  proctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY(exam_id, proctor_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_proctors_proctor ON exam_proctors(proctor_id);
