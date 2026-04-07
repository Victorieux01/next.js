import { fetchAllProjects } from '@/app/lib/coredon-data';
import EarningsClient from '@/app/ui/dashboard/earnings-client';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function EarningsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const projects = await fetchAllProjects(session.user.id);
  return <EarningsClient projects={projects} />;
}
