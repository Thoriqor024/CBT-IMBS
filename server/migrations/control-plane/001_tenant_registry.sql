BEGIN;

CREATE SCHEMA IF NOT EXISTS control_plane;

CREATE TABLE IF NOT EXISTS control_plane.platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_users_email_nonempty CHECK (length(trim(email)) BETWEEN 3 AND 254),
  CONSTRAINT platform_users_full_name_nonempty CHECK (length(trim(full_name)) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_users_email_lower_key
  ON control_plane.platform_users (lower(email));

CREATE TABLE IF NOT EXISTS control_plane.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'suspended', 'closed')),
  database_name TEXT NOT NULL UNIQUE,
  database_secret_ref TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 0 CHECK (schema_version >= 0),
  max_students INTEGER NOT NULL DEFAULT 400 CHECK (max_students BETWEEN 1 AND 100000),
  max_teachers INTEGER NOT NULL DEFAULT 25 CHECK (max_teachers BETWEEN 1 AND 10000),
  trial_ends_at TIMESTAMPTZ,
  service_ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES control_plane.platform_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenants_school_code_format CHECK (school_code ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$'),
  CONSTRAINT tenants_display_name_nonempty CHECK (length(trim(display_name)) BETWEEN 1 AND 160),
  CONSTRAINT tenants_database_name_format CHECK (database_name ~ '^[a-z][a-z0-9_]{0,62}$'),
  CONSTRAINT tenants_secret_ref_nonempty CHECK (length(trim(database_secret_ref)) BETWEEN 1 AND 300)
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_school_code_lower_key
  ON control_plane.tenants (lower(school_code));
CREATE INDEX IF NOT EXISTS tenants_status_service_end_idx
  ON control_plane.tenants (status, service_ends_at);

CREATE TABLE IF NOT EXISTS control_plane.tenant_database_secrets (
  secret_ref TEXT PRIMARY KEY,
  database_user TEXT NOT NULL,
  encrypted_password BYTEA NOT NULL,
  nonce BYTEA NOT NULL CHECK (octet_length(nonce) = 12),
  auth_tag BYTEA NOT NULL CHECK (octet_length(auth_tag) = 16),
  key_version SMALLINT NOT NULL DEFAULT 1 CHECK (key_version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_secret_ref_format CHECK (secret_ref ~ '^[a-zA-Z0-9/_-]{1,255}$'),
  CONSTRAINT tenant_database_user_format CHECK (database_user ~ '^[a-z][a-z0-9_]{0,62}$')
);

CREATE TABLE IF NOT EXISTS control_plane.platform_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES control_plane.platform_users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES control_plane.tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_audit_action_nonempty CHECK (length(trim(action)) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS platform_audit_tenant_created_idx
  ON control_plane.platform_audit_logs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  sid VARCHAR NOT NULL,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON public.user_sessions (expire);

COMMIT;