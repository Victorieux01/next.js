'use server';
import supabase from './supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendDisputeRejectionEmail } from './sendgrid';

const COLORS = ['#4285F4','#00C896','#9AA0A6','#F9AB00','#EA4335','#A142F4','#24C1E0','#FF7043'];

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}

// ── PROJECTS ──
export async function createProject(formData: FormData) {
  const name           = formData.get('name') as string;
  const email          = formData.get('email') as string;
  const description    = formData.get('description') as string;
  const amount         = parseFloat(formData.get('amount') as string);
  const startDate      = formData.get('start_date') as string;
  const endDate        = formData.get('end_date') as string;
  const expectedDate   = formData.get('expected_date') as string;
  const paymentMethod  = (formData.get('payment_method') as string) || null;
  const contractNotes  = (formData.get('contract_notes') as string) || null;

  const initials = getInitials(name);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  await supabase.from('coredon_projects').insert({
    name, email, description, amount, status: 'Pending', initials, color,
    start_date:     startDate    || null,
    end_date:       endDate      || null,
    expected_date:  expectedDate || null,
    prepaid_method: paymentMethod,
    // store contract notes in description if provided
    ...(contractNotes ? { description: description + (description ? '\n\n' : '') + contractNotes } : {}),
  });

  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}

export async function updateProjectStatus(id: string, status: string) {
  await supabase.from('coredon_projects').update({ status }).eq('id', id);
  revalidatePath('/dashboard/projects');
  revalidatePath(`/dashboard/projects/${id}`);
}

export async function deleteProject(id: string) {
  await supabase.from('coredon_projects').delete().eq('id', id);
  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}

export async function addRevision(projectId: string, note: string) {
  const date = new Date().toISOString().slice(0, 10);
  await supabase.from('coredon_project_revisions').insert({ project_id: projectId, date, note });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addVersion(projectId: string, fileName: string) {
  const date = new Date().toISOString().slice(0, 10);
  await supabase.from('coredon_project_versions').insert({ project_id: projectId, date, note: fileName });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function openDispute(projectId: string, reason: string) {
  const date = new Date().toISOString().slice(0, 10);
  await Promise.all([
    supabase.from('coredon_project_disputes').insert({ project_id: projectId, reason, date, status: 'Open' }),
    supabase.from('coredon_projects').update({ status: 'Dispute' }).eq('id', projectId),
  ]);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function resolveDispute(disputeId: string, projectId: string, resolution: 'accept' | 'reject') {
  const date = new Date().toISOString().slice(0, 10);
  const status = resolution === 'accept' ? 'Resolved' : 'Rejected';
  const [, disputeRes] = await Promise.all([
    supabase.from('coredon_project_disputes').update({ status, resolved_date: date }).eq('id', disputeId),
    supabase.from('coredon_project_disputes').select('reason').eq('id', disputeId).single(),
  ]);
  // Both accept and reject unfreeze the project (dispute is over)
  await supabase.from('coredon_projects').update({ status: 'Funded' }).eq('id', projectId);
  if (resolution === 'reject') {
    const { data: proj } = await supabase.from('coredon_projects').select('email, name').eq('id', projectId).single();
    if (proj) {
      const reason = disputeRes.data?.reason ?? '';
      await sendDisputeRejectionEmail(proj.email, proj.name, reason).catch(() => {});
    }
  }
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addDisputeNote(disputeId: string, note: string, projectId: string) {
  const { data } = await supabase.from('coredon_project_disputes').select('reason').eq('id', disputeId).single();
  const currentReason = data?.reason ?? '';
  const date = new Date().toISOString().slice(0, 10);
  const newReason = currentReason + `\n\n── Internal Note (${date}) ──\n${note}`;
  await supabase.from('coredon_project_disputes').update({ reason: newReason }).eq('id', disputeId);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleProjectPin(id: string, pinned: boolean) {
  await supabase.from('coredon_projects').update({ pinned }).eq('id', id);
  revalidatePath('/dashboard/projects');
  revalidatePath('/dashboard');
}

// ── CLIENTS ──
export async function createClient(formData: FormData) {
  const company     = formData.get('company') as string;
  const name        = formData.get('name') as string;
  const email       = formData.get('email') as string;
  const phone       = formData.get('phone') as string;
  const address     = formData.get('address') as string;
  const note        = formData.get('note') as string;
  const outstanding = parseFloat(formData.get('outstanding') as string) || 0;

  await supabase.from('coredon_clients').insert({
    company, name, email, phone, address,
    note: note || 'New Client',
    outstanding,
  });
  revalidatePath('/dashboard/clients');
}

export async function updateClient(id: string, formData: FormData) {
  const company     = formData.get('company') as string;
  const name        = formData.get('name') as string;
  const email       = formData.get('email') as string;
  const phone       = formData.get('phone') as string;
  const address     = formData.get('address') as string;
  const note        = formData.get('note') as string;
  const outstanding = parseFloat(formData.get('outstanding') as string) || 0;

  await supabase.from('coredon_clients').update({
    company, name, email, phone, address, note, outstanding,
  }).eq('id', id);
  revalidatePath('/dashboard/clients');
}

export async function deleteClient(id: string) {
  await supabase.from('coredon_clients').delete().eq('id', id);
  revalidatePath('/dashboard/clients');
}
