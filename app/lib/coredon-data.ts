import supabase from './supabase';
import { Project, CoredonClient } from './coredon-types';

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
    revisions: Array.isArray(row.coredon_project_revisions) ? row.coredon_project_revisions : [],
    versions: Array.isArray(row.coredon_project_versions) ? row.coredon_project_versions : [],
    files: Array.isArray(row.coredon_project_files) ? row.coredon_project_files : [],
    disputes: Array.isArray(row.coredon_project_disputes) ? row.coredon_project_disputes : [],
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
    const [projects, clients] = await Promise.all([fetchAllProjects(), fetchAllClients()]);
    return { projects, clients };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return { projects: [], clients: [] };
  }
}

export async function fetchAllProjects(): Promise<Project[]> {
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
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(serializeProject);
  } catch (error) {
    console.error('fetchAllProjects error:', error);
    return [];
  }
}

export async function fetchProjectById(id: string): Promise<Project | null> {
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
      .eq('id', id)
      .single();
    if (error) throw error;
    return data ? serializeProject(data) : null;
  } catch (error) {
    console.error('fetchProjectById error:', error);
    return null;
  }
}

export async function fetchAllClients(): Promise<CoredonClient[]> {
  try {
    const { data, error } = await supabase
      .from('coredon_clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(serializeClient);
  } catch (error) {
    console.error('fetchAllClients error:', error);
    return [];
  }
}
