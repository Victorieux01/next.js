'use server';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const COLORS = ['#4285F4','#00C896','#9AA0A6','#F9AB00','#EA4335','#A142F4','#24C1E0','#FF7043'];

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}

// ── PROJECTS ──
export async function createProject(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const description = formData.get('description') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const startDate = formData.get('start_date') as string;
  const endDate = formData.get('end_date') as string;
  const expectedDate = formData.get('expected_date') as string;

  const initials = getInitials(name);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  await sql`
    INSERT INTO coredon_projects (name, email, description, amount, status, initials, color, start_date, end_date, expected_date)
    VALUES (${name}, ${email}, ${description}, ${amount}, 'Pending', ${initials}, ${color}, ${startDate}, ${endDate}, ${expectedDate})
  `;

  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}

export async function updateProjectStatus(id: string, status: string) {
  await sql`UPDATE coredon_projects SET status = ${status} WHERE id = ${id}`;
  revalidatePath('/dashboard/projects');
  revalidatePath(`/dashboard/projects/${id}`);
}

export async function deleteProject(id: string) {
  await sql`DELETE FROM coredon_projects WHERE id = ${id}`;
  revalidatePath('/dashboard/projects');
  redirect('/dashboard/projects');
}

export async function addRevision(projectId: string, note: string) {
  const date = new Date().toISOString().slice(0, 10);
  await sql`INSERT INTO coredon_project_revisions (project_id, date, note) VALUES (${projectId}, ${date}, ${note})`;
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function openDispute(projectId: string, reason: string) {
  const date = new Date().toISOString().slice(0, 10);
  await sql`INSERT INTO coredon_project_disputes (project_id, reason, date, status) VALUES (${projectId}, ${reason}, ${date}, 'Open')`;
  await sql`UPDATE coredon_projects SET status = 'Dispute' WHERE id = ${projectId}`;
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function resolveDispute(disputeId: string, projectId: string, resolution: 'accept' | 'reject') {
  const date = new Date().toISOString().slice(0, 10);
  const status = resolution === 'accept' ? 'Resolved' : 'Rejected — Refunded';
  await sql`UPDATE coredon_project_disputes SET status = ${status}, resolved_date = ${date} WHERE id = ${disputeId}`;
  if (resolution === 'accept') {
    await sql`UPDATE coredon_projects SET status = 'Funded' WHERE id = ${projectId}`;
  }
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function toggleProjectPin(id: string, pinned: boolean) {
  await sql`UPDATE coredon_projects SET pinned = ${pinned} WHERE id = ${id}`;
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

  await sql`
    INSERT INTO coredon_clients (company, name, email, phone, address, note, outstanding)
    VALUES (${company}, ${name}, ${email}, ${phone}, ${address}, ${note || 'New Client'}, ${outstanding})
  `;
  revalidatePath('/dashboard/clients');
}

export async function updateClient(id: string, formData: FormData) {
  const company = formData.get('company') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;
  const note = formData.get('note') as string;
  const outstanding = parseFloat(formData.get('outstanding') as string) || 0;

  await sql`
    UPDATE coredon_clients
    SET company = ${company}, name = ${name}, email = ${email}, phone = ${phone}, address = ${address}, note = ${note}, outstanding = ${outstanding}
    WHERE id = ${id}
  `;
  revalidatePath('/dashboard/clients');
}

export async function deleteClient(id: string) {
  await sql`DELETE FROM coredon_clients WHERE id = ${id}`;
  revalidatePath('/dashboard/clients');
}
