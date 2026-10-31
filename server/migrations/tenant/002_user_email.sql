BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_format_check;
ALTER TABLE users ADD CONSTRAINT users_email_format_check
  CHECK (email IS NULL OR (length(trim(email)) BETWEEN 3 AND 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON users (lower(email))
  WHERE email IS NOT NULL;

COMMIT;