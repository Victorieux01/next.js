import { fetchAllProjects } from '@/app/lib/coredon-data';
import HistoryClient from '@/app/ui/dashboard/history-client';

export default async function HistoryPage() {
  const projects = await fetchAllProjects();
  const released = projects.filter(p => p.status === 'Released');
  return <HistoryClient projects={released} />;
}
