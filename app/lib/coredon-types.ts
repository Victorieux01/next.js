export type ProjectStatus = 'Funded' | 'Pending' | 'Released' | 'Dispute';

export interface ProjectRevision {
  id: string;
  project_id: string;
  date: string;
  note: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  date: string;
  note: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  date: string;
  type: 'pdf' | 'video' | 'image' | 'doc';
  url?: string;
}

export interface ProjectDispute {
  id: string;
  project_id: string;
  reason: string;
  date: string;
  status: string;
  resolved_date?: string;
}

export interface Project {
  id: string;
  name: string;
  email: string;
  status: ProjectStatus;
  amount: number;
  initials: string;
  color: string;
  start_date: string;
  end_date?: string;
  expected_date?: string;
  completion_date?: string;
  prepaid_date?: string;
  prepaid_method?: string;
  released_date?: string;
  description: string;
  pinned: boolean;
  created_at: string;
  user_id: string;
  revisions: ProjectRevision[];
  versions: ProjectVersion[];
  files: ProjectFile[];
  disputes: ProjectDispute[];
}

export interface CoredonClient {
  id: string;
  company: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  outstanding: number;
  note?: string;
  user_id: string;
  created_at: string;
}
