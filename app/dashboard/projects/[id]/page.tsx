import { fetchProjectById } from '@/app/lib/coredon-data';
import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/app/ui/dashboard/project-detail-client';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await fetchProjectById(id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}
