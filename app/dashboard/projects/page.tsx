import { fetchAllProjects } from '@/app/lib/coredon-data';
import ProjectsClient from '@/app/ui/dashboard/projects-client';

export default async function ProjectsPage() {
  const projects = await fetchAllProjects();
  return <ProjectsClient projects={projects} />;
}
