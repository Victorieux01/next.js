import { fetchProjectById } from '@/app/lib/coredon-data';
import { getUserProfile } from '@/app/lib/coredon-actions';
import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/app/ui/dashboard/project-detail-client';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';
import type { PlanKey } from '@/app/lib/coredon-types';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const { id } = await params;
  const [project, profile] = await Promise.all([
    fetchProjectById(id, session.user.id),
    getUserProfile(),
  ]);
  if (!project) notFound();
  const planMap: Record<string, PlanKey> = { free: 'starter', starter: 'starter', pro: 'pro', studio: 'studio' };
  const userPlan: PlanKey = planMap[profile.plan] ?? 'starter';
  return <ProjectDetailClient project={project} providerName={session.user.name ?? 'Provider'} userPlan={userPlan} />;
}
