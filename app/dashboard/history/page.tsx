import { fetchAllProjects } from '@/app/lib/coredon-data';
import HistoryClient from '@/app/ui/dashboard/history-client';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function HistoryPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const projects = await fetchAllProjects(session.user.id);
  const released = projects.filter(p => p.status === 'Released');
  return <HistoryClient projects={released} />;
}
