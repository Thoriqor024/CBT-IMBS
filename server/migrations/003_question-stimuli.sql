CREATE TABLE IF NOT EXISTS question_stimuli (
  id BIGSERIAL PRIMARY KEY,
  bank_id BIGINT NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  media_key TEXT,
  media_alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS stimulus_id BIGINT REFERENCES question_stimuli(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_stimulus_id ON questions(stimulus_id);
CREATE INDEX IF NOT EXISTS idx_stimuli_bank_id ON question_stimuli(bank_id);

