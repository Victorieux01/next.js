import postgres from 'postgres';
import { NextResponse } from 'next/server';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS coredon_projects (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          TEXT NOT NULL,
        email         TEXT,
        status        TEXT DEFAULT 'Pending',
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
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        date DATE,
        note TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        date DATE,
        note TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        name TEXT,
        date DATE,
        type TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_project_disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES coredon_projects(id) ON DELETE CASCADE,
        reason TEXT,
        date DATE,
        status TEXT DEFAULT 'Open',
        resolved_date DATE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coredon_clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company TEXT NOT NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        outstanding NUMERIC DEFAULT 0,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Seed demo data - clients
    const clientCount = await sql`SELECT COUNT(*) FROM coredon_clients`;
    if (parseInt(clientCount[0].count) === 0) {
      await sql`
        INSERT INTO coredon_clients (company, name, email, phone, address, outstanding, note) VALUES
        ('Apex Studios', 'Jordan Lee', 'contact@apexstudios.ca', '514-555-0101', '1200 McGill College Ave, Montréal, QC', 1850, 'Authorization Created'),
        ('Nova Collective', 'Marie Tremblay', 'nova@novacollective.io', '438-555-0202', '500 René-Lévesque Blvd W, Montréal, QC', 3200, 'Escrow Active'),
        ('Drift Media', 'Alex Kim', 'media@driftmedia.co', '514-555-0303', '', 720, 'Awaiting Funding'),
        ('Solène Marchand', 'Solène Marchand', 'solene@marchand.com', '450-555-0404', '88 Laurier Ave, Outremont, QC', 950, 'Payment Released'),
        ('Blackline Records', 'Devon Walsh', 'finance@blackline.com', '514-555-0505', '', 2100, 'Dispute Open'),
        ('Lumière Films', 'Chloé Dupont', 'prod@lumierefilms.ca', '438-555-0606', '3455 Rue Drummond, Montréal, QC', 4500, 'Authorization Created'),
        ('Pixel & Frame', 'Sam Rivera', 'hello@pixelframe.co', '514-555-0707', '', 1200, 'Appeal Note'),
        ('Studio North', 'Lena Okafor', 'lena@studionorth.ca', '514-555-0808', '100 St-Paul Ouest, Montréal, QC', 3800, 'Web Authorization')
      `;
    }

    // Seed demo data - projects
    const projectCount = await sql`SELECT COUNT(*) FROM coredon_projects`;
    if (parseInt(projectCount[0].count) === 0) {
      // Insert projects
      const p1 = await sql`INSERT INTO coredon_projects (name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description) VALUES ('Apex Studios', 'contact@apexstudios.ca', 'Funded', 1850, 'AS', '#4285F4', '2025-01-10', '2025-03-14', '2025-02-28', '2025-01-10', 'Stripe Connect', 'Brand Reel — Q2 Campaign') RETURNING id`;
      const p2 = await sql`INSERT INTO coredon_projects (name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description) VALUES ('Nova Collective', 'nova@novacollective.io', 'Funded', 3200, 'NC', '#00C896', '2025-02-01', '2025-03-19', '2025-03-10', '2025-02-01', 'Interac e-Transfer', 'YouTube Series Ep. 4–6') RETURNING id`;
      const p3 = await sql`INSERT INTO coredon_projects (name, email, status, amount, initials, color, start_date, end_date, expected_date, description) VALUES ('Drift Media', 'media@driftmedia.co', 'Pending', 720, 'DM', '#9AA0A6', '2025-03-01', '2025-03-22', '2025-03-18', 'Product Launch Video') RETURNING id`;
      const p4 = await sql`INSERT INTO coredon_projects (name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, released_date, completion_date, description) VALUES ('Solène Marchand', 'solene@marchand.com', 'Released', 950, 'SM', '#F9AB00', '2025-01-05', '2025-02-28', '2025-02-20', '2025-01-05', 'Stripe Connect', '2025-02-28', '2025-02-27', 'Wedding Highlights Edit') RETURNING id`;
      const p5 = await sql`INSERT INTO coredon_projects (name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description) VALUES ('Blackline Records', 'finance@blackline.com', 'Dispute', 2100, 'BR', '#EA4335', '2025-01-20', '2025-03-05', '2025-02-25', '2025-01-20', 'Credit Card (Stripe)', 'Artist Documentary Teaser') RETURNING id`;
      const p6 = await sql`INSERT INTO coredon_projects (name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, description) VALUES ('Lumière Films', 'prod@lumierefilms.ca', 'Funded', 4500, 'LF', '#A142F4', '2025-02-15', '2025-04-10', '2025-03-30', '2025-02-15', 'Stripe Connect', 'Short Film Post-Production') RETURNING id`;
      const p7 = await sql`INSERT INTO coredon_projects (name, email, status, amount, initials, color, start_date, end_date, expected_date, prepaid_date, prepaid_method, released_date, completion_date, description) VALUES ('Pixel & Frame', 'hello@pixelframe.co', 'Released', 1200, 'PF', '#24C1E0', '2024-11-01', '2024-12-20', '2024-12-05', '2024-11-01', 'Stripe Connect', '2024-12-20', '2024-12-18', 'Brand Identity Video') RETURNING id`;

      // Suppress unused variable warnings
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

    return NextResponse.json({ message: 'Coredon database seeded successfully!' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
