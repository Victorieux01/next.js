import supabase from './supabase';
import { Project, CoredonClient } from './coredon-types';

function toStr(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProject(row: any, related: {
  revisions: any[]; versions: any[]; files: any[]; disputes: any[]; messages: any[];
}): Project {
  return {
    ...row,
    amount: parseFloat(row.amount) || 0,
    start_date: toStr(row.start_date),
    end_date: toStr(row.end_date),
    expected_date: toStr(row.expected_date),
    completion_date: toStr(row.completion_date),
    prepaid_date: toStr(row.prepaid_date),
    released_date: toStr(row.released_date),
    approved_date: toStr(row.approved_date),
    created_at: toStr(row.created_at),
    revisions: related.revisions,
    versions:  related.versions,
    files: related.files.map((f: any) => ({
      ...f,
      url: `${process.env.SUPABASE_URL}/storage/v1/object/public/project-files/${f.project_id}/${encodeURIComponent(f.name)}`,
    })),
    disputes: related.disputes,
    messages: related.messages.map((m: any) => ({ ...m, created_at: toStr(m.created_at) })),
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

// Fetch messages separately — gracefully returns [] if the table doesn't exist yet
async function fetchMessages(projectIds: string[]): Promise<any[]> {
  if (projectIds.length === 0) return [];
  try {
    const { data } = await supabase
      .from('coredon_project_messages')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: true });
    return data ?? [];
  } catch {
    return [];
  }
}

const PROJECT_BASE = `
  *,
  coredon_project_revisions(*),
  coredon_project_versions(*),
  coredon_project_files(*),
  coredon_project_disputes(*)
`;

async function _fetchAllProjects(userId: string): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from('coredon_projects')
      .select(PROJECT_BASE)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || JSON.stringify(error));

    const rows = data ?? [];
    const ids = rows.map((p: any) => p.id as string);
    const messages = await fetchMessages(ids);

    return rows.map((p: any) =>
      serializeProject(p, {
        revisions: p.coredon_project_revisions ?? [],
        versions:  p.coredon_project_versions  ?? [],
        files:     p.coredon_project_files      ?? [],
        disputes:  p.coredon_project_disputes   ?? [],
        messages:  messages.filter((m: any) => m.project_id === p.id),
      })
    );
  } catch (error) {
    console.error('fetchAllProjects error:', error instanceof Error ? error.message : JSON.stringify(error));
    return [];
  }
}

export function fetchAllProjects(userId: string) {
  return _fetchAllProjects(userId);
}

async function _fetchAllClients(userId: string): Promise<CoredonClient[]> {
  try {
    const { data, error } = await supabase
      .from('coredon_clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || JSON.stringify(error));
    return (data ?? []).map(serializeClient);
  } catch (error) {
    console.error('fetchAllClients error:', error instanceof Error ? error.message : JSON.stringify(error));
    return [];
  }
}

export function fetchAllClients(userId: string) {
  return _fetchAllClients(userId);
}

export async function fetchDashboardData(userId: string) {
  try {
    const [projects, clients] = await Promise.all([fetchAllProjects(userId), fetchAllClients(userId)]);
    return { projects, clients };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return { projects: [], clients: [] };
  }
}

export async function fetchProjectById(id: string, userId: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('coredon_projects')
      .select(PROJECT_BASE)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    if (!data) return null;

    const messages = await fetchMessages([id]);

    return serializeProject(data, {
      revisions: data.coredon_project_revisions ?? [],
      versions:  data.coredon_project_versions  ?? [],
      files:     data.coredon_project_files      ?? [],
      disputes:  data.coredon_project_disputes   ?? [],
      messages,
    });
  } catch (error) {
    console.error('fetchProjectById error:', error instanceof Error ? error.message : JSON.stringify(error));
    return null;
  }
}

export async function fetchProjectByIdPublic(id: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('coredon_projects')
      .select(PROJECT_BASE)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    if (!data) return null;

    const messages = await fetchMessages([id]);

    return serializeProject(data, {
      revisions: data.coredon_project_revisions ?? [],
      versions:  data.coredon_project_versions  ?? [],
      files:     data.coredon_project_files      ?? [],
      disputes:  data.coredon_project_disputes   ?? [],
      messages,
    });
  } catch (error) {
    console.error('fetchProjectByIdPublic error:', error instanceof Error ? error.message : JSON.stringify(error));
    return null;
  }
}

export async function markProjectFundedByClient(id: string): Promise<void> {
  try {
    await supabase
      .from('coredon_projects')
      .update({ status: 'Funded', prepaid_date: new Date().toISOString().slice(0, 10) })
      .eq('id', id)
      .eq('status', 'Pending');
  } catch (error) {
    console.error('markProjectFundedByClient error:', error instanceof Error ? error.message : JSON.stringify(error));
  }
}

export async function fetchUserSettings(userId: string): Promise<{ plan: string; phone: string; first_name: string; last_name: string } | null> {
  try {
    const { data } = await supabase
      .from('coredon_user_settings')
      .select('plan, phone, first_name, last_name')
      .eq('user_id', userId)
      .single();
    return data as { plan: string; phone: string; first_name: string; last_name: string } | null;
  } catch {
    return null;
  }
}
