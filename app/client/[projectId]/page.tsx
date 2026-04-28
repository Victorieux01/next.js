import { fetchProjectByIdPublic, markProjectFundedByClient, fetchProjectsByEmail } from '@/app/lib/coredon-data';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { stripe } from '@/app/lib/stripe';
import ClientProjectView from '@/app/ui/dashboard/client-project-view';
import { verifyPortalToken } from '@/app/lib/portal-token';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ session_id?: string; funded?: string; token?: string }>;
}) {
  const { projectId } = await params;
  const { session_id, funded, token } = await searchParams;

  if (!token || !verifyPortalToken(projectId, token)) notFound();

  // Verify the Stripe Checkout session and mark Funded if payment succeeded
  if (session_id && funded === '1') {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (
        session.payment_status === 'paid' &&
        session.metadata?.projectId === projectId
      ) {
        await markProjectFundedByClient(projectId);
        revalidatePath(`/dashboard/projects/${projectId}`);
        revalidatePath('/dashboard/projects');
        revalidatePath('/dashboard');
      }
    } catch (err) {
      console.error('Stripe session verification error:', err);
    }
  }

  const project = await fetchProjectByIdPublic(projectId);
  if (!project) notFound();

  const allProjects = await fetchProjectsByEmail(project.email ?? '');

  return <ClientProjectView project={project} allProjects={allProjects} />;
}
