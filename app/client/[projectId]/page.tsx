import { fetchProjectByIdPublic, markProjectFundedByClient } from '@/app/lib/coredon-data';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import ClientProjectView from '@/app/ui/dashboard/client-project-view';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await fetchProjectByIdPublic(projectId);
  if (!project) notFound();

  // Automatically mark as Funded when client opens the link (only if still Pending)
  if (project.status === 'Pending') {
    await markProjectFundedByClient(projectId);
    project.status = 'Funded';
    project.prepaid_date = new Date().toISOString().slice(0, 10);
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath('/dashboard/projects');
    revalidatePath('/dashboard');
  }

  return <ClientProjectView project={project} />;
}
