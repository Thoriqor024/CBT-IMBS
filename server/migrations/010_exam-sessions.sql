ALTER TABLE exams ADD COLUMN IF NOT EXISTS session_number INTEGER CHECK (session_number IS NULL OR session_number > 0);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS session_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS session_start TIME;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS session_end TIME;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS session_updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS session_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_exams_session_date ON exams(session_date, session_start);
