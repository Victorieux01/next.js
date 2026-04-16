import { fetchProjectById } from '@/app/lib/coredon-data';
import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/app/ui/dashboard/project-detail-client';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const project = await fetchProjectById(id, session.user.id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}
