CREATE TABLE IF NOT EXISTS exam_submit_idempotency (
  session_id BIGINT NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  http_status INTEGER NOT NULL DEFAULT 200 CHECK (http_status BETWEEN 100 AND 599),
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(session_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_exam_submit_idempotency_created ON exam_submit_idempotency(created_at);
