ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'id';

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS text_direction TEXT NOT NULL DEFAULT 'auto';

UPDATE subjects
SET language_code = 'ar', text_direction = 'rtl'
WHERE lower(name) LIKE '%arab%'
  AND language_code = 'id'
  AND text_direction = 'auto';

CREATE TABLE IF NOT EXISTS question_media (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  file_size INTEGER NOT NULL CHECK (file_size BETWEEN 1 AND 3145728),
  alt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
