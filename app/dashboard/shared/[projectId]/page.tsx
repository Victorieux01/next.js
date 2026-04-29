import { fetchProjectByIdPublic, fetchProjectsByEmail } from '@/app/lib/coredon-data';
import { getSession } from '@/app/lib/session';
import { generatePortalToken } from '@/app/lib/portal-token';
import { notFound, redirect } from 'next/navigation';
import ClientProjectView from '@/app/ui/dashboard/client-project-view';

export const dynamic = 'force-dynamic';

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const session = await getSession();
  if (!session?.user?.id) redirect('/login');

  const project = await fetchProjectByIdPublic(projectId);
  if (!project) notFound();

  // Only show the project if the logged-in user is the client on it
  if (project.email?.toLowerCase() !== session.user.email?.toLowerCase()) notFound();

  const rawProjects = await fetchProjectsByEmail(project.email ?? '', session.user.id);
  const allProjects = rawProjects.map(p => ({
    ...p,
    token: generatePortalToken(p.id),
  }));

  return <ClientProjectView project={project} allProjects={allProjects} />;
}
