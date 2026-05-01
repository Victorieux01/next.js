import { fetchAllProjects } from '@/app/lib/coredon-data';
import ProjectsClient from '@/app/ui/dashboard/projects-client';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const projects = await fetchAllProjects(session.user.id);
  return <ProjectsClient projects={projects} />;
}
