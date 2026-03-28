-- Coredon Dashboard — Database Schema
-- Run this in your Supabase SQL editor or PostgreSQL instance

-- Projects
CREATE TABLE IF NOT EXISTS coredon_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT,
  status        TEXT CHECK (status IN ('Funded','Pending','Released','Dispute')) DEFAULT 'Pending',
  amount        NUMERIC NOT NULL DEFAULT 0,
  initials      TEXT,
  color         TEXT DEFAULT '#4285F4',
  start_date    DATE,
  end_date      DATE,
  expected_date DATE,
  completion_date DATE,
  prepaid_date  DATE,
  prepaid_method TEXT,
  released_date DATE,
  description   TEXT,
  pinned        BOOLEAN DEFAULT false,
  user_id       UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

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
  type       TEXT CHECK (type IN ('pdf','video','doc'))
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON coredon_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user ON coredon_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON coredon_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_revisions_project ON coredon_project_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_versions_project ON coredon_project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON coredon_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_disputes_project ON coredon_project_disputes(project_id);
