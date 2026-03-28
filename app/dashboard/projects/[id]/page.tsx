import { fetchProjectById } from '@/app/lib/coredon-data';
import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/app/ui/dashboard/project-detail-client';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await fetchProjectById(params.id);
  if (!project) notFound();
  return <ProjectDetailClient project={project} />;
}
