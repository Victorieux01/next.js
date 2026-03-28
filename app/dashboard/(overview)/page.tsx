import { fetchDashboardData } from '@/app/lib/coredon-data';
import DashboardHome from '@/app/ui/dashboard/dashboard-home';

export default async function DashboardPage() {
  const { projects, clients } = await fetchDashboardData();
  return <DashboardHome projects={projects} clients={clients} />;
}
