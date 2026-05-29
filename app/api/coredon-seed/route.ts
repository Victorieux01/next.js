import postgres from 'postgres';
import { NextResponse } from 'next/server';

let _sql: ReturnType<typeof postgres> | null = null;
function getSql() {
  if (!_sql) {
    const rawUrl = (process.env.POSTGRES_URL ?? '').replace(/^["']|["']$/g, '');
    _sql = postgres(rawUrl, { ssl: 'require' });
  }
  return _sql;
}

export async function GET() {
  const sql = getSql();
  try {
    // ── Core tables ──────────────────────────────────────────────────────────

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_projects (
        id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            TEXT        NOT NULL,
        project_code       TEXT,
        name               TEXT        NOT NULL,
        email              TEXT,
        status             TEXT        DEFAULT 'Pending',
        amount             NUMERIC     NOT NULL DEFAULT 0,
        initials           TEXT,
        color              TEXT        DEFAULT '#4285F4',
        start_date         DATE,
        end_date           DATE,
        expected_date      DATE,
        completion_date    DATE,
        prepaid_date       DATE,
        prepaid_method     TEXT,
        released_date      DATE,
        approved_date      DATE,
        payment_type       TEXT        DEFAULT 'one_time',
        installment_months INTEGER     DEFAULT 1,
        description        TEXT,
        pinned             BOOLEAN     DEFAULT false,
        created_at         TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_revisions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        date       DATE,
        note       TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_versions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        date       DATE,
        note       TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_files (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        name       TEXT,
        date       DATE,
        type       TEXT,
        url        TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_disputes (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id    UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        reason        TEXT,
        date          DATE,
        status        TEXT DEFAULT 'Open',
        resolved_date DATE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_messages (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  UUID        NOT NULL REFERENCES coredon_projects(id) ON DELETE CASCADE,
        sender      TEXT        NOT NULL CHECK (sender IN ('client', 'provider')),
        sender_name TEXT        NOT NULL,
        content     TEXT        NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_coredon_project_messages_project_id
      ON coredon_project_messages (project_id, created_at)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_rushes (
        id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id    UUID    REFERENCES coredon_projects(id) ON DELETE CASCADE,
        name          TEXT    NOT NULL,
        date          DATE,
        file_count    INTEGER DEFAULT 1,
        total_size_mb NUMERIC,
        note          TEXT,
        url           TEXT,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_coredon_project_rushes_project_id
      ON coredon_project_rushes (project_id)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_storage_packs (
        id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id   UUID    REFERENCES coredon_projects(id) ON DELETE CASCADE,
        size         TEXT    NOT NULL CHECK (size IN ('S','M','L','XL')),
        storage_gb   INTEGER NOT NULL,
        price_cad    NUMERIC NOT NULL,
        purchased_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_clients (
        id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT    NOT NULL,
        company     TEXT    NOT NULL,
        name        TEXT,
        email       TEXT,
        phone       TEXT,
        address     TEXT,
        outstanding NUMERIC DEFAULT 0,
        note        TEXT,
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_user_settings (
        id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT    NOT NULL UNIQUE,
        plan        TEXT    DEFAULT 'free',
        phone       TEXT    DEFAULT '',
        first_name  TEXT    DEFAULT '',
        last_name   TEXT    DEFAULT '',
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_coredon_user_settings_user_id
      ON coredon_user_settings (user_id)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_processing_jobs (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id        UUID        REFERENCES coredon_projects(id) ON DELETE CASCADE,
        storage_key       TEXT        NOT NULL,
        file_name         TEXT,
        file_size_gb      NUMERIC     DEFAULT 0,
        status            TEXT        DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed')),
        preview_key       TEXT,
        estimated_minutes INTEGER,
        error_message     TEXT,
        created_at        TIMESTAMPTZ DEFAULT now(),
        finished_at       TIMESTAMPTZ
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_coredon_processing_jobs_project_id
      ON coredon_processing_jobs (project_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_coredon_processing_jobs_status
      ON coredon_processing_jobs (status)
    `;

    // ── Safe migrations for pre-existing databases ────────────────────────────
    await sql`ALTER TABLE coredon_projects ADD COLUMN IF NOT EXISTS user_id            TEXT`;
    await sql`ALTER TABLE coredon_projects ADD COLUMN IF NOT EXISTS project_code       TEXT`;
    await sql`ALTER TABLE coredon_projects ADD COLUMN IF NOT EXISTS payment_type       TEXT    DEFAULT 'one_time'`;
    await sql`ALTER TABLE coredon_projects ADD COLUMN IF NOT EXISTS installment_months INTEGER DEFAULT 1`;
    await sql`ALTER TABLE coredon_projects ADD COLUMN IF NOT EXISTS approved_date      DATE`;
    await sql`ALTER TABLE coredon_project_files ADD COLUMN IF NOT EXISTS url           TEXT`;
    await sql`ALTER TABLE coredon_clients ADD COLUMN IF NOT EXISTS user_id             TEXT`;

    // Tell PostgREST to reload its schema cache
    await sql`SELECT pg_notify('pgrst', 'reload schema')`;

    // ── Demo seed data ────────────────────────────────────────────────────────
    // Associate demo data with the first registered user, if any.
    const users = await sql`SELECT id FROM users LIMIT 1`;
    const demoUserId: string | null = users[0]?.id ?? null;

    if (demoUserId) {
      const projectCount = await sql`SELECT COUNT(*) FROM coredon_projects WHERE user_id = ${demoUserId}`;
      if (parseInt(projectCount[0].count) === 0) {
        const p1 = await sql`
          INSERT INTO coredon_projects
            (user_id, name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description)
          VALUES
            (${demoUserId}, 'Apex Studios', 'contact@apexstudios.ca', 'Funded', 1850, 'AS', '#4285F4',
             '2025-01-10', '2025-03-14', '2025-02-28', '2025-01-10', 'Stripe', 'Brand Reel — Q2 Campaign')
          RETURNING id
        `;
        const p2 = await sql`
          INSERT INTO coredon_projects
            (user_id, name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description)
          VALUES
            (${demoUserId}, 'Nova Collective', 'nova@novacollective.io', 'Funded', 3200, 'NC', '#00C896',
             '2025-02-01', '2025-03-19', '2025-03-10', '2025-02-01', 'ACSS / EFT', 'YouTube Series Ep. 4–6')
          RETURNING id
        `;
        const p3 = await sql`
          INSERT INTO coredon_projects
            (user_id, name, email, status, amount, initials, color, start_date, end_date, expected_date, description)
          VALUES
            (${demoUserId}, 'Drift Media', 'media@driftmedia.co', 'Pending', 720, 'DM', '#9AA0A6',
             '2025-03-01', '2025-03-22', '2025-03-18', 'Product Launch Video')
          RETURNING id
        `;
        const p4 = await sql`
          INSERT INTO coredon_projects
            (user_id, name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, released_date, completion_date, description)
          VALUES
            (${demoUserId}, 'Solène Marchand', 'solene@marchand.com', 'Released', 950, 'SM', '#F9AB00',
             '2025-01-05', '2025-02-28', '2025-02-20', '2025-01-05', 'Stripe', '2025-02-28', '2025-02-27',
             'Wedding Highlights Edit')
          RETURNING id
        `;
        const p5 = await sql`
          INSERT INTO coredon_projects
            (user_id, name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description)
          VALUES
            (${demoUserId}, 'Blackline Records', 'finance@blackline.com', 'Dispute', 2100, 'BR', '#EA4335',
             '2025-01-20', '2025-03-05', '2025-02-25', '2025-01-20', 'Stripe', 'Artist Documentary Teaser')
          RETURNING id
        `;
        const p6 = await sql`
          INSERT INTO coredon_projects
            (user_id, name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description)
          VALUES
            (${demoUserId}, 'Lumière Films', 'prod@lumierefilms.ca', 'Funded', 4500, 'LF', '#A142F4',
             '2025-02-15', '2025-04-10', '2025-03-30', '2025-02-15', 'Stripe', 'Short Film Post-Production')
          RETURNING id
        `;
        const p7 = await sql`
          INSERT INTO coredon_projects
            (user_id, name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, released_date, completion_date, payment_type, installment_months, description)
          VALUES
            (${demoUserId}, 'Pixel & Frame', 'hello@pixelframe.co', 'Released', 1200, 'PF', '#24C1E0',
             '2024-10-01', '2024-12-20', '2024-12-05', '2024-10-01', 'Stripe', '2024-12-20', '2024-12-18',
             'installments', 3, 'Brand Identity Video')
          RETURNING id
        `;

        void p2; void p3; void p6;

        // Revisions
        await sql`INSERT INTO coredon_project_revisions (project_id, date, note) VALUES (${p1[0].id}, '2025-02-01', 'Color grade revision requested')`;
        await sql`INSERT INTO coredon_project_revisions (project_id, date, note) VALUES (${p4[0].id}, '2025-01-25', 'Audio sync issue')`;

        // Versions
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p1[0].id}, '2025-01-20', 'v1 uploaded')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p1[0].id}, '2025-02-05', 'v2 uploaded after revision')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p2[0].id}, '2025-02-20', 'v1 uploaded')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p4[0].id}, '2025-01-15', 'v1 uploaded')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p4[0].id}, '2025-01-30', 'v2 uploaded')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p5[0].id}, '2025-02-01', 'v1 uploaded')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p6[0].id}, '2025-03-01', 'v1 uploaded')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p7[0].id}, '2024-11-20', 'v1 uploaded')`;
        await sql`INSERT INTO coredon_project_versions (project_id, date, note) VALUES (${p7[0].id}, '2024-12-10', 'v2 final')`;

        // Files
        await sql`INSERT INTO coredon_project_files (project_id, name, date, type) VALUES (${p1[0].id}, 'Project_Contract.pdf', '2025-01-10', 'pdf')`;
        await sql`INSERT INTO coredon_project_files (project_id, name, date, type) VALUES (${p1[0].id}, 'Brand_Reel_v2.mp4', '2025-02-05', 'video')`;
        await sql`INSERT INTO coredon_project_files (project_id, name, date, type) VALUES (${p4[0].id}, 'Contract.pdf', '2025-01-05', 'pdf')`;
        await sql`INSERT INTO coredon_project_files (project_id, name, date, type) VALUES (${p4[0].id}, 'Wedding_v2.mp4', '2025-01-30', 'video')`;
        await sql`INSERT INTO coredon_project_files (project_id, name, date, type) VALUES (${p4[0].id}, 'Invoice_SM_01.pdf', '2025-02-28', 'doc')`;
        await sql`INSERT INTO coredon_project_files (project_id, name, date, type) VALUES (${p7[0].id}, 'Project_Contract.pdf', '2024-11-01', 'pdf')`;
        await sql`INSERT INTO coredon_project_files (project_id, name, date, type) VALUES (${p7[0].id}, 'Final_Video_v2.mp4', '2024-12-20', 'video')`;

        // Disputes
        await sql`INSERT INTO coredon_project_disputes (project_id, reason, date, status, resolved_date) VALUES (${p5[0].id}, 'Client claims the final cut does not match the agreed brief.', '2025-02-10', 'Resolved', '2025-02-18')`;
        await sql`INSERT INTO coredon_project_disputes (project_id, reason, date, status) VALUES (${p5[0].id}, 'Client opened a second dispute: additional footage was not included in the final edit.', '2025-02-28', 'Open')`;
      }

      const clientCount = await sql`SELECT COUNT(*) FROM coredon_clients WHERE user_id = ${demoUserId}`;
      if (parseInt(clientCount[0].count) === 0) {
        await sql`
          INSERT INTO coredon_clients (user_id, company, name, email, phone, address, outstanding, note) VALUES
          (${demoUserId}, 'Apex Studios',      'Jordan Lee',       'contact@apexstudios.ca',  '514-555-0101', '1200 McGill College Ave, Montréal, QC', 1850, 'Authorization Created'),
          (${demoUserId}, 'Nova Collective',   'Marie Tremblay',   'nova@novacollective.io',  '438-555-0202', '500 René-Lévesque Blvd W, Montréal, QC', 3200, 'Escrow Active'),
          (${demoUserId}, 'Drift Media',       'Alex Kim',         'media@driftmedia.co',     '514-555-0303', '', 720, 'Awaiting Funding'),
          (${demoUserId}, 'Solène Marchand',   'Solène Marchand',  'solene@marchand.com',     '450-555-0404', '88 Laurier Ave, Outremont, QC', 950, 'Payment Released'),
          (${demoUserId}, 'Blackline Records', 'Devon Walsh',      'finance@blackline.com',   '514-555-0505', '', 2100, 'Dispute Open'),
          (${demoUserId}, 'Lumière Films',     'Chloé Dupont',     'prod@lumierefilms.ca',    '438-555-0606', '3455 Rue Drummond, Montréal, QC', 4500, 'Authorization Created'),
          (${demoUserId}, 'Pixel & Frame',     'Sam Rivera',       'hello@pixelframe.co',     '514-555-0707', '', 1200, 'Appeal Note'),
          (${demoUserId}, 'Studio North',      'Lena Okafor',      'lena@studionorth.ca',     '514-555-0808', '100 St-Paul Ouest, Montréal, QC', 3800, 'Web Authorization')
        `;
      }
    }

    return NextResponse.json({
      message: 'Coredon database seeded successfully!',
      demoDataLinkedToUser: demoUserId ?? 'none (no users found — register first)',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
