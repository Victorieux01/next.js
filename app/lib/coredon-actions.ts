'use server';
import supabase from './supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendDisputeRejectionEmail, sendContractEmail, sendPreviewEmail, sendApprovalEmail, sendRequestChangesEmail } from './sendgrid';
import { auth } from '@/auth';

const COLORS = ['#4285F4','#00C896','#9AA0A6','#F9AB00','#EA4335','#A142F4','#24C1E0','#FF7043'];

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}

async function getUserSession(): Promise<{ id: string; name: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return { id: session.user.id, name: session.user.name ?? 'Provider' };
}

async function getUserId(): Promise<string> {
  return (await getUserSession()).id;
}

// ── PROJECTS ──
export async function createProject(formData: FormData) {
  const { id: userId, name: editorName } = await getUserSession();
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
  const finalDescription = contractNotes
    ? description + (description ? '\n\n' : '') + contractNotes
    : description;

  const { data: inserted } = await supabase.from('coredon_projects').insert({
    user_id: userId,
    name, email, description: finalDescription, amount, status: 'Pending', initials, color,
    start_date:     startDate    || null,
    end_date:       endDate      || null,
    expected_date:  expectedDate || null,
    prepaid_method: paymentMethod,
  }).select('id').single();

  // Add client to clients tab if not already present (match by email)
  const { data: existingClient } = await supabase
    .from('coredon_clients')
    .select('id')
    .eq('user_id', userId)
    .eq('email', email)
    .single();

  if (!existingClient) {
    await supabase.from('coredon_clients').insert({
      user_id:     userId,
      name,
      email,
      company:     name,
      outstanding: amount,
      note:        'Added automatically from project',
    });
    revalidatePath('/dashboard/clients');
  } else {
    // Bump outstanding by this project's amount
    const { data: cl } = await supabase
      .from('coredon_clients')
      .select('outstanding')
      .eq('id', existingClient.id)
      .single();
    await supabase
      .from('coredon_clients')
      .update({ outstanding: (cl?.outstanding ?? 0) + amount })
      .eq('id', existingClient.id);
    revalidatePath('/dashboard/clients');
  }

  // Send contract email to the client
  if (inserted?.id && email) {
    sendContractEmail({
      clientEmail:  email,
      clientName:   name,
      editorName,
      projectName:  name,
      description:  finalDescription,
      amount,
      startDate:    startDate  || '',
      deadline:     endDate    || '',
      projectId:    inserted.id,
      appUrl:       process.env.NEXT_PUBLIC_APP_URL ?? 'https://coredon.app',
    }).catch(err => console.error('Contract email error:', err));
  }

  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}

export async function updateProjectStatus(id: string, status: string) {
  const userId = await getUserId();
  await supabase.from('coredon_projects').update({ status }).eq('id', id).eq('user_id', userId);
  revalidatePath('/dashboard/projects');
  revalidatePath(`/dashboard/projects/${id}`);
}

export async function deleteProject(id: string) {
  const userId = await getUserId();
  await supabase.from('coredon_projects').delete().eq('id', id).eq('user_id', userId);
  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}

export async function addRevision(projectId: string, note: string) {
  await getUserId();
  const date = new Date().toISOString().slice(0, 10);
  await supabase.from('coredon_project_revisions').insert({ project_id: projectId, date, note });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addVersion(projectId: string, fileName: string) {
  await getUserId();
  const date = new Date().toISOString().slice(0, 10);
  await supabase.from('coredon_project_versions').insert({ project_id: projectId, date, note: fileName });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function openDispute(projectId: string, reason: string) {
  await getUserId();
  const date = new Date().toISOString().slice(0, 10);
  await Promise.all([
    supabase.from('coredon_project_disputes').insert({ project_id: projectId, reason, date, status: 'Open' }),
    supabase.from('coredon_projects').update({ status: 'Dispute' }).eq('id', projectId),
  ]);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function resolveDispute(disputeId: string, projectId: string, resolution: 'accept' | 'reject') {
  await getUserId();
  const date = new Date().toISOString().slice(0, 10);
  const status = resolution === 'accept' ? 'Resolved' : 'Rejected';
  const [, disputeRes] = await Promise.all([
    supabase.from('coredon_project_disputes').update({ status, resolved_date: date }).eq('id', disputeId),
    supabase.from('coredon_project_disputes').select('reason').eq('id', disputeId).single(),
  ]);
  const projectStatus = resolution === 'reject' ? 'Released' : 'Funded';
  await supabase.from('coredon_projects').update({ status: projectStatus }).eq('id', projectId);
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
  await getUserId();
  const { data } = await supabase.from('coredon_project_disputes').select('reason').eq('id', disputeId).single();
  const currentReason = data?.reason ?? '';
  const date = new Date().toISOString().slice(0, 10);
  const newReason = currentReason + `\n\n── Internal Note (${date}) ──\n${note}`;
  await supabase.from('coredon_project_disputes').update({ reason: newReason }).eq('id', disputeId);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleProjectPin(id: string, pinned: boolean) {
  const userId = await getUserId();
  await supabase.from('coredon_projects').update({ pinned }).eq('id', id).eq('user_id', userId);
  revalidatePath('/dashboard/projects');
  revalidatePath('/dashboard');
}

// ── CLIENTS ──
export async function createClient(formData: FormData) {
  const userId      = await getUserId();
  const company     = formData.get('company') as string;
  const name        = formData.get('name') as string;
  const email       = formData.get('email') as string;
  const phone       = formData.get('phone') as string;
  const address     = formData.get('address') as string;
  const note        = formData.get('note') as string;
  const outstanding = parseFloat(formData.get('outstanding') as string) || 0;

  await supabase.from('coredon_clients').insert({
    user_id: userId,
    company, name, email, phone, address,
    note: note || 'New Client',
    outstanding,
  });
  revalidatePath('/dashboard/clients');
}

export async function updateClient(id: string, formData: FormData) {
  const userId      = await getUserId();
  const company     = formData.get('company') as string;
  const name        = formData.get('name') as string;
  const email       = formData.get('email') as string;
  const phone       = formData.get('phone') as string;
  const address     = formData.get('address') as string;
  const note        = formData.get('note') as string;
  const outstanding = parseFloat(formData.get('outstanding') as string) || 0;

  await supabase.from('coredon_clients').update({
    company, name, email, phone, address, note, outstanding,
  }).eq('id', id).eq('user_id', userId);
  revalidatePath('/dashboard/clients');
}

export async function deleteClient(id: string) {
  const userId = await getUserId();
  await supabase.from('coredon_clients').delete().eq('id', id).eq('user_id', userId);
  revalidatePath('/dashboard/clients');
}

// ── USER PROFILE ──
export async function getUserProfile(): Promise<{ plan: string; phone: string; firstName: string; lastName: string }> {
  const userId = await getUserId();
  try {
    const { data } = await supabase
      .from('coredon_user_settings')
      .select('plan, phone, first_name, last_name')
      .eq('user_id', userId)
      .single();
    return {
      plan:      data?.plan       ?? 'free',
      phone:     data?.phone      ?? '',
      firstName: data?.first_name ?? '',
      lastName:  data?.last_name  ?? '',
    };
  } catch {
    return { plan: 'free', phone: '', firstName: '', lastName: '' };
  }
}

export async function updateUserProfile(data: {
  firstName: string;
  lastName: string;
  phone: string;
  plan: string;
}) {
  const userId = await getUserId();
  const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
  await Promise.all([
    name ? supabase.from('users').update({ name }).eq('id', userId) : Promise.resolve(),
    supabase.from('coredon_user_settings').upsert({
      user_id: userId,
      plan: data.plan || 'free',
      phone: data.phone || '',
      first_name: data.firstName || '',
      last_name: data.lastName || '',
    }, { onConflict: 'user_id' }),
  ]);
  revalidatePath('/dashboard/earnings');
}

// ── Escrow: Client Approval & Change Requests ────────────────────────────────

// Called from the public client portal — no session required.
// The project ID is the only access token (shared via email link).
export async function approveProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const date = new Date().toISOString().slice(0, 10);

    // Only approve if still Funded (idempotent guard)
    const { data: project, error: fetchErr } = await supabase
      .from('coredon_projects')
      .select('id, name, email, amount, user_id, status')
      .eq('id', projectId)
      .single();

    if (fetchErr || !project) return { success: false, error: 'Project not found.' };
    if (project.status === 'Released') return { success: true }; // already done
    if (project.status !== 'Funded') return { success: false, error: 'Project is not in a fundable state.' };

    await supabase.from('coredon_projects').update({
      status:        'Released',
      released_date: date,
      approved_date: date,
      completion_date: date,
    }).eq('id', projectId);

    revalidatePath(`/client/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath('/dashboard/projects');
    revalidatePath('/dashboard');

    // Notify provider by email
    const { data: provider } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', project.user_id)
      .single();

    if (provider?.email) {
      sendApprovalEmail({
        providerEmail: provider.email,
        providerName:  provider.name ?? 'Provider',
        projectName:   project.name,
        amount:        parseFloat(project.amount) || 0,
        projectId,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://coredon.app',
      }).catch(err => console.error('Approval email error:', err));
    }

    return { success: true };
  } catch (err) {
    console.error('approveProject error:', err);
    return { success: false, error: 'Failed to approve project.' };
  }
}

// Called from the public client portal — no session required.
export async function clientRequestChanges(
  projectId: string,
  clientName: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const date = new Date().toISOString().slice(0, 10);

    const { data: project, error: fetchErr } = await supabase
      .from('coredon_projects')
      .select('id, name, user_id, status')
      .eq('id', projectId)
      .single();

    if (fetchErr || !project) return { success: false, error: 'Project not found.' };
    if (project.status === 'Released') return { success: false, error: 'Project is already completed.' };

    // Add revision entry so it appears in the timeline
    await supabase.from('coredon_project_revisions').insert({
      project_id: projectId,
      date,
      note: `[Client] ${reason}`,
    });

    revalidatePath(`/client/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);

    // Notify provider by email
    const { data: provider } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', project.user_id)
      .single();

    if (provider?.email) {
      sendRequestChangesEmail({
        providerEmail: provider.email,
        providerName:  provider.name ?? 'Provider',
        projectName:   project.name,
        clientName,
        reason,
        projectId,
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://coredon.app',
      }).catch(err => console.error('Request changes email error:', err));
    }

    return { success: true };
  } catch (err) {
    console.error('clientRequestChanges error:', err);
    return { success: false, error: 'Failed to submit request.' };
  }
}

// ── Preview Notification ──────────────────────────────────────────────────────
export async function sendPreviewNotification(
  projectId: string,
  clientEmail: string,
  clientName: string,
  projectName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getUserId(); // ensure authenticated
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://coredon.app';
    const previewUrl = `${appUrl}/client/${projectId}`;
    await sendPreviewEmail({ clientEmail, clientName, projectName, previewUrl });
    return { success: true };
  } catch (err) {
    console.error('sendPreviewNotification error:', err);
    return { success: false, error: 'Failed to send preview email.' };
  }
}
