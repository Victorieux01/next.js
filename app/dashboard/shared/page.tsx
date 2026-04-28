import { fetchProjectsByEmail } from '@/app/lib/coredon-data';
import { generatePortalToken } from '@/app/lib/portal-token';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import SharedClient from '@/app/ui/dashboard/shared-client';

export default async function SharedPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const email = session.user.email ?? '';
  const raw = await fetchProjectsByEmail(email);
  const projects = raw.map(p => ({ ...p, token: generatePortalToken(p.id) }));
  return <SharedClient projects={projects} />;
}
