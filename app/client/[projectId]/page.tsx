import { fetchProjectByIdPublic } from '@/app/lib/coredon-data';
import { notFound } from 'next/navigation';
import ClientProjectView from '@/app/ui/dashboard/client-project-view';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await fetchProjectByIdPublic(projectId);
  if (!project) notFound();
  return <ClientProjectView project={project!} />;
}
