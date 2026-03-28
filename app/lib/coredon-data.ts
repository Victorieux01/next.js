import postgres from 'postgres';
import { Project, CoredonClient } from './coredon-types';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

function toStr(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProject(row: any): Project {
  return {
    ...row,
    amount: parseFloat(row.amount) || 0,
    start_date: toStr(row.start_date),
    end_date: toStr(row.end_date),
    expected_date: toStr(row.expected_date),
    completion_date: toStr(row.completion_date),
    prepaid_date: toStr(row.prepaid_date),
    released_date: toStr(row.released_date),
    created_at: toStr(row.created_at),
    revisions: Array.isArray(row.revisions) ? row.revisions : [],
    versions: Array.isArray(row.versions) ? row.versions : [],
    files: Array.isArray(row.files) ? row.files : [],
    disputes: Array.isArray(row.disputes) ? row.disputes : [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeClient(row: any): CoredonClient {
  return {
    ...row,
    outstanding: parseFloat(row.outstanding) || 0,
    created_at: toStr(row.created_at),
  };
}

export async function fetchDashboardData() {
  try {
    const projects = await fetchAllProjects();
    const clients = await fetchAllClients();
    return { projects, clients };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return { projects: [], clients: [] };
  }
}

export async function fetchAllProjects(): Promise<Project[]> {
  try {
    const rows = await sql`
      SELECT
        p.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', r.id, 'project_id', r.project_id, 'date', r.date::text, 'note', r.note))
          FILTER (WHERE r.id IS NOT NULL), '[]'
        ) as revisions,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', v.id, 'project_id', v.project_id, 'date', v.date::text, 'note', v.note))
          FILTER (WHERE v.id IS NOT NULL), '[]'
        ) as versions,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', f.id, 'project_id', f.project_id, 'name', f.name, 'date', f.date::text, 'type', f.type))
          FILTER (WHERE f.id IS NOT NULL), '[]'
        ) as files,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', d.id, 'project_id', d.project_id, 'reason', d.reason, 'date', d.date::text, 'status', d.status, 'resolved_date', d.resolved_date::text))
          FILTER (WHERE d.id IS NOT NULL), '[]'
        ) as disputes
      FROM coredon_projects p
      LEFT JOIN coredon_project_revisions r ON r.project_id = p.id
      LEFT JOIN coredon_project_versions v ON v.project_id = p.id
      LEFT JOIN coredon_project_files f ON f.project_id = p.id
      LEFT JOIN coredon_project_disputes d ON d.project_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    return (rows as unknown[]).map(serializeProject);
  } catch (error) {
    console.error('fetchAllProjects error:', error);
    return [];
  }
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  try {
    const rows = await sql`
      SELECT
        p.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', r.id, 'project_id', r.project_id, 'date', r.date::text, 'note', r.note)) FILTER (WHERE r.id IS NOT NULL), '[]') as revisions,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', v.id, 'project_id', v.project_id, 'date', v.date::text, 'note', v.note)) FILTER (WHERE v.id IS NOT NULL), '[]') as versions,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', f.id, 'project_id', f.project_id, 'name', f.name, 'date', f.date::text, 'type', f.type)) FILTER (WHERE f.id IS NOT NULL), '[]') as files,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', d.id, 'project_id', d.project_id, 'reason', d.reason, 'date', d.date::text, 'status', d.status, 'resolved_date', d.resolved_date::text)) FILTER (WHERE d.id IS NOT NULL), '[]') as disputes
      FROM coredon_projects p
      LEFT JOIN coredon_project_revisions r ON r.project_id = p.id
      LEFT JOIN coredon_project_versions v ON v.project_id = p.id
      LEFT JOIN coredon_project_files f ON f.project_id = p.id
      LEFT JOIN coredon_project_disputes d ON d.project_id = p.id
      WHERE p.id = ${id}
      GROUP BY p.id
    `;
    return rows[0] ? serializeProject(rows[0]) : null;
  } catch (error) {
    console.error('fetchProjectById error:', error);
    return null;
  }
}

export async function fetchAllClients(): Promise<CoredonClient[]> {
  try {
    const rows = await sql`SELECT * FROM coredon_clients ORDER BY created_at DESC`;
    return (rows as unknown[]).map(serializeClient);
  } catch (error) {
    console.error('fetchAllClients error:', error);
    return [];
  }
}
