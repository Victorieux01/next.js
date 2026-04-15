-- Coredon Dashboard — Database Schema
-- Run this in your Supabase SQL editor or PostgreSQL instance
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS guards)

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Projects
CREATE TABLE IF NOT EXISTS coredon_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT,
  status          TEXT CHECK (status IN ('Funded','Pending','Released','Dispute')) DEFAULT 'Pending',
  amount          NUMERIC NOT NULL DEFAULT 0,
  initials        TEXT,
  color           TEXT DEFAULT '#4285F4',
  start_date      DATE,
  end_date        DATE,
  expected_date   DATE,
  completion_date DATE,
  prepaid_date    DATE,
  prepaid_method  TEXT,
  released_date   DATE,
  approved_date   DATE,
  description     TEXT,
  pinned          BOOLEAN DEFAULT false,
  user_id         UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Add approved_date if running migration on an existing table
ALTER TABLE coredon_projects ADD COLUMN IF NOT EXISTS approved_date DATE;

-- Project Revisions
CREATE TABLE IF NOT EXISTS coredon_project_revisions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
  date       DATE,
  note       TEXT
);

-- Project Versions
CREATE TABLE IF NOT EXISTS coredon_project_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
  date       DATE,
  note       TEXT
);

-- Project Files
CREATE TABLE IF NOT EXISTS coredon_project_files (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
  name       TEXT,
  date       DATE,
  type       TEXT CHECK (type IN ('pdf','video','image','doc'))
);

-- Project Disputes
CREATE TABLE IF NOT EXISTS coredon_project_disputes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
  reason        TEXT,
  date          DATE,
  status        TEXT DEFAULT 'Open',
  resolved_date DATE
);

-- Clients
CREATE TABLE IF NOT EXISTS coredon_clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company     TEXT NOT NULL,
  name        TEXT,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  outstanding NUMERIC DEFAULT 0,
  note        TEXT,
  user_id     UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- User Settings (plan, billing, Stripe Connect, profile)
CREATE TABLE IF NOT EXISTS coredon_user_settings (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan              TEXT NOT NULL DEFAULT 'free',
  phone             TEXT NOT NULL DEFAULT '',
  first_name        TEXT NOT NULL DEFAULT '',
  last_name         TEXT NOT NULL DEFAULT '',
  stripe_account_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_status   ON coredon_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user     ON coredon_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user      ON coredon_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_revisions_project ON coredon_project_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_project  ON coredon_project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project     ON coredon_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_disputes_project  ON coredon_project_disputes(project_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- Enable RLS on every table so the anon key cannot leak cross-user data.
-- The app uses the service-role key server-side (bypasses RLS by design).
-- These policies protect against any future client-side or direct API access.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE coredon_projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coredon_project_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coredon_project_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coredon_project_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coredon_project_disputes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coredon_clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coredon_user_settings     ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before re-creating (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "projects_owner_all"      ON coredon_projects;
  DROP POLICY IF EXISTS "projects_public_select"  ON coredon_projects;
  DROP POLICY IF EXISTS "revisions_owner_all"     ON coredon_project_revisions;
  DROP POLICY IF EXISTS "versions_owner_all"      ON coredon_project_versions;
  DROP POLICY IF EXISTS "files_owner_all"         ON coredon_project_files;
  DROP POLICY IF EXISTS "disputes_owner_all"      ON coredon_project_disputes;
  DROP POLICY IF EXISTS "clients_owner_all"       ON coredon_clients;
  DROP POLICY IF EXISTS "settings_owner_all"      ON coredon_user_settings;
END $$;

-- coredon_projects: owner has full access; anyone can read by id (client portal)
CREATE POLICY "projects_owner_all" ON coredon_projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "projects_public_select" ON coredon_projects
  FOR SELECT USING (true);

-- Related tables: owner of the parent project has full access
CREATE POLICY "revisions_owner_all" ON coredon_project_revisions
  FOR ALL USING (
    project_id IN (
      SELECT id FROM coredon_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "versions_owner_all" ON coredon_project_versions
  FOR ALL USING (
    project_id IN (
      SELECT id FROM coredon_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "files_owner_all" ON coredon_project_files
  FOR ALL USING (
    project_id IN (
      SELECT id FROM coredon_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "disputes_owner_all" ON coredon_project_disputes
  FOR ALL USING (
    project_id IN (
      SELECT id FROM coredon_projects WHERE user_id = auth.uid()
    )
  );

-- Clients: owner only
CREATE POLICY "clients_owner_all" ON coredon_clients
  FOR ALL USING (auth.uid() = user_id);

-- User settings: own row only
CREATE POLICY "settings_owner_all" ON coredon_user_settings
  FOR ALL USING (auth.uid() = user_id);
