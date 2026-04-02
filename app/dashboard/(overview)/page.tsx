import { fetchDashboardData } from '@/app/lib/coredon-data';
import DashboardHome from '@/app/ui/dashboard/dashboard-home';
import { auth } from '@/auth';

export default async function DashboardPage() {
  const session = await auth();
  const { projects, clients } = await fetchDashboardData();
  return <DashboardHome projects={projects} clients={clients} user={session?.user} />;
}
