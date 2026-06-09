export type ProjectStatus =
  | 'Draft' | 'Invited' | 'Processing' | 'Funded' | 'In Review'
  | 'Released' | 'Received' | 'Archived' | 'Disputed'
  | 'Pending' | 'Dispute' | 'Ready' | 'Revision'; // legacy aliases

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

export interface ProjectRush {
  id: string;
  project_id: string;
  name: string;
  date: string;
  file_count: number;
  total_size_mb?: number;
  note?: string;
  url?: string;
}

export type StoragePackSize = 'S' | 'M' | 'L' | 'XL';
export interface StoragePack {
  size: StoragePackSize;
  storage_gb: number;
  price_cad: number;
}
export const STORAGE_PACKS: StoragePack[] = [
  { size: 'S',  storage_gb: 100,  price_cad: 5  },
  { size: 'M',  storage_gb: 250,  price_cad: 10 },
  { size: 'L',  storage_gb: 500,  price_cad: 20 },
  { size: 'XL', storage_gb: 1000, price_cad: 40 },
];

// RunPod L4 GPU — billing at $0.00011/sec + $10/month container disk proration
export function getJobProfile(fileSizeGb: number): { estimatedMinutes: number; costUsd: number } {
  if (fileSizeGb < 5)  return { estimatedMinutes: 5,  costUsd: 0.03 };
  if (fileSizeGb < 20) return { estimatedMinutes: 8,  costUsd: 0.06 };
  if (fileSizeGb < 50) return { estimatedMinutes: 13, costUsd: 0.09 };
  return                       { estimatedMinutes: 18, costUsd: 0.13 };
}

/** @deprecated Use getJobProfile */
export const getVcpuProfile = getJobProfile as (fileSizeGb: number) => { estimatedMinutes: number; costUsd: number; vcpu?: number };

export interface Project {
  id: string;
  project_code?: string;
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
  received_date?: string;
  approved_date?: string;
  payment_type?: 'one_time' | 'installments';
  installment_months?: number;
  description: string;
  pinned: boolean;
  created_at: string;
  user_id: string;
  revisions: ProjectRevision[];
  versions: ProjectVersion[];
  files: ProjectFile[];
  disputes: ProjectDispute[];
  messages: ProjectMessage[];
  rushes: ProjectRush[];
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  sender: 'client' | 'provider';
  sender_name: string;
  content: string;
  created_at: string;
}

export function getDeliverables(description: string): string {
  return (description || '').split('\n\n[meta]::')[0].trim();
}

export function getProjectMeta(description: string): {
  clientName: string; hourlyRate: number; hours: number; technicalCost: number;
  artisticCost: number; revisions: number; paymentMethods: string[];
  videoType: VideoType | ''; videoDestination: VideoDestination | '';
  assignmentType: AssignmentType | ''; referenceLinks: string;
} {
  const match = (description || '').match(/\[meta\]::(.*?)(?:\n|$)/);
  const empty = { clientName: '', hourlyRate: 0, hours: 0, technicalCost: 0, artisticCost: 0, revisions: 0, paymentMethods: ['card'], videoType: '' as const, videoDestination: '' as const, assignmentType: '' as const, referenceLinks: '' };
  if (!match) return empty;
  try {
    const m = JSON.parse(match[1]);
    return {
      clientName: m.cn || '', hourlyRate: m.r || 0, hours: m.h || 0,
      technicalCost: m.tc || 0, artisticCost: m.ac || 0, revisions: m.rv || 0,
      paymentMethods: m.pm || ['card'],
      videoType: (m.vt as VideoType) || '',
      videoDestination: (m.vd as VideoDestination) || '',
      assignmentType: (m.at as AssignmentType) || '',
      referenceLinks: m.rl || '',
    };
  } catch {
    return empty;
  }
}

export function mapPaymentMethod(type: string): string {
  switch (type) {
    case 'card':            return 'Credit / Debit Card';
    case 'acss_debit':      return 'Bank Transfer (ACSS)';
    case 'paypal':          return 'PayPal';
    case 'us_bank_account': return 'Bank Transfer';
    default:                return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

// ── Legal / Brief fields ─────────────────────────────────────────────────────
export type AssignmentType = 'complete' | 'limited';

// Legal clause text per Section 3 of the legal document
export function getAssignmentClause(assignmentType: AssignmentType | '' | undefined, editorName: string): string {
  if (assignmentType === 'complete') {
    return `The editor (${editorName || 'the editor'}) transfers to the client all economic rights over the delivered work, exclusively, worldwide, and in perpetuity, upon full release of the escrow payment. The editor retains their inalienable moral right and the right to present the work in their personal portfolio.`;
  }
  if (assignmentType === 'limited') {
    return `The editor (${editorName || 'the editor'}) grants the client a license to use the work according to the terms defined in the editor's contract attached to this transaction. In the absence of explicitly defined license terms in said contract, this assignment is automatically considered a complete assignment (as per Option A above).`;
  }
  return '';
}

// ── Video brief fields — used for automatic SS amplitude calculation ──────────
export type VideoType = 'wedding_event_corporate' | 'pub_broadcast_clip_cinema';
export type VideoDestination = 'web_social' | 'tv_cinema_festival';
export type SsAmplitude = 'very_low' | 'low' | 'medium' | 'high';

// Section 3 of architecture doc: amplitude auto-selection logic.
// Proxy always uses medium/high — this function targets the SS master only.
export function getSsAmplitude(
  videoType: VideoType | '' | undefined,
  destination: VideoDestination | '' | undefined,
  budgetUsd: number,
): SsAmplitude {
  if (budgetUsd > 50000) return 'very_low';
  if (videoType === 'pub_broadcast_clip_cinema') return 'low';
  if (videoType === 'wedding_event_corporate' && destination === 'tv_cinema_festival') return 'low';
  return 'medium';
}

export function isB2Key(url: string | undefined): boolean {
  return !!(url && (url.includes('/previews/') || url.includes('/originals/')));
}

export type PlanKey = 'starter' | 'pro' | 'studio' | 'free';

export const PLAN_CONFIGS: Record<PlanKey, {
  label: string;
  feePercent: number;
  minProject: number;
  storagGb: number;
  retentionDays: number;
  autoReleaseDays: number;
  milestonesMax: number | null;
  milestoneMin: number | null;
}> = {
  starter: { label: 'Starter', feePercent: 5,   minProject: 50,   storagGb: 25,  retentionDays: 14, autoReleaseDays: 7,  milestonesMax: 0,    milestoneMin: null },
  pro:     { label: 'Pro',     feePercent: 2.5,  minProject: 200,  storagGb: 100, retentionDays: 30, autoReleaseDays: 14, milestonesMax: 3,    milestoneMin: 200  },
  studio:  { label: 'Studio',  feePercent: 1,    minProject: 1000, storagGb: 200, retentionDays: 60, autoReleaseDays: 14, milestonesMax: 5,    milestoneMin: 1000 },
  free:    { label: 'Starter', feePercent: 5,    minProject: 50,   storagGb: 25,  retentionDays: 14, autoReleaseDays: 7,  milestonesMax: 0,    milestoneMin: null },
};

export function calcStripeFee(amount: number, method: 'acss' | 'card'): number {
  if (method === 'acss') return Math.min(amount * 0.01 + 0.30, 4.00);
  return amount * 0.029 + 0.30;
}

export function calcPayout(amount: number, plan: PlanKey, method: 'acss' | 'card'): {
  platformFee: number; stripeFee: number; veReceives: number;
} {
  const cfg = PLAN_CONFIGS[plan] ?? PLAN_CONFIGS.starter;
  const platformFee = amount * (cfg.feePercent / 100);
  const stripeFee   = calcStripeFee(amount, method);
  return { platformFee, stripeFee, veReceives: amount - platformFee - stripeFee };
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
