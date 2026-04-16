import { fetchAllProjects, fetchUserSettings } from '@/app/lib/coredon-data';
import EarningsClient from '@/app/ui/dashboard/earnings-client';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function EarningsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const [projects, settings] = await Promise.all([
    fetchAllProjects(session.user.id),
    fetchUserSettings(session.user.id),
  ]);
  const rawName = session.user.name ?? '';
  const firstName = settings?.first_name || rawName.split(' ')[0] || '';
  const lastName  = settings?.last_name  || rawName.split(' ').slice(1).join(' ') || '';
  return (
    <EarningsClient
      projects={projects}
      user={{
        name:      rawName,
        email:     session.user.email ?? '',
        plan:      settings?.plan  ?? 'free',
        phone:     settings?.phone ?? '',
        firstName,
        lastName,
      }}
    />
  );
}
