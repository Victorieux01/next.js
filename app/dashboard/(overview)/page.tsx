import { fetchDashboardData } from '@/app/lib/coredon-data';
import DashboardHome from '@/app/ui/dashboard/dashboard-home';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const { projects, clients } = await fetchDashboardData(session.user.id);
  return <DashboardHome projects={projects} clients={clients} user={session?.user} />;
}
