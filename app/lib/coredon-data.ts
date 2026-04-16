import supabase from './supabase';
import { Project, CoredonClient } from './coredon-types';

function toStr(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProject(row: any, related: {
  revisions: any[]; versions: any[]; files: any[]; disputes: any[];
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

// Fetch all related rows for a set of project IDs in parallel
async function fetchRelated(projectIds: string[]) {
  if (projectIds.length === 0) return { revisions: [], versions: [], files: [], disputes: [] };

  const [r, v, f, d] = await Promise.all([
    supabase.from('coredon_project_revisions').select('*').in('project_id', projectIds),
    supabase.from('coredon_project_versions').select('*').in('project_id', projectIds),
    supabase.from('coredon_project_files').select('*').in('project_id', projectIds),
    supabase.from('coredon_project_disputes').select('*').in('project_id', projectIds),
  ]);

  return {
    revisions: r.data ?? [],
    versions:  v.data ?? [],
    files:     f.data ?? [],
    disputes:  d.data ?? [],
  };
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

export async function fetchAllProjects(userId: string): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from('coredon_projects')
      .select(`
        *,
        coredon_project_revisions(*),
        coredon_project_versions(*),
        coredon_project_files(*),
        coredon_project_disputes(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || JSON.stringify(error));

    return (data ?? []).map((p: any) =>
      serializeProject(p, {
        revisions: p.coredon_project_revisions ?? [],
        versions:  p.coredon_project_versions  ?? [],
        files:     p.coredon_project_files      ?? [],
        disputes:  p.coredon_project_disputes   ?? [],
      })
    );
  } catch (error) {
    console.error('fetchAllProjects error:', error instanceof Error ? error.message : JSON.stringify(error));
    return [];
  }
}

const PROJECT_WITH_RELATED = `
  *,
  coredon_project_revisions(*),
  coredon_project_versions(*),
  coredon_project_files(*),
  coredon_project_disputes(*)
`;

export async function fetchProjectById(id: string, userId: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('coredon_projects')
      .select(PROJECT_WITH_RELATED)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    if (!data) return null;

    return serializeProject(data, {
      revisions: data.coredon_project_revisions ?? [],
      versions:  data.coredon_project_versions  ?? [],
      files:     data.coredon_project_files      ?? [],
      disputes:  data.coredon_project_disputes   ?? [],
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
      .select(PROJECT_WITH_RELATED)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    if (!data) return null;

    return serializeProject(data, {
      revisions: data.coredon_project_revisions ?? [],
      versions:  data.coredon_project_versions  ?? [],
      files:     data.coredon_project_files      ?? [],
      disputes:  data.coredon_project_disputes   ?? [],
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
      .eq('status', 'Pending'); // only transitions from Pending → Funded
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

export async function fetchAllClients(userId: string): Promise<CoredonClient[]> {
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
