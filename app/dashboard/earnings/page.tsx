import { fetchAllProjects } from '@/app/lib/coredon-data';
import EarningsClient from '@/app/ui/dashboard/earnings-client';

export default async function EarningsPage() {
  const projects = await fetchAllProjects();
  return <EarningsClient projects={projects} />;
}
