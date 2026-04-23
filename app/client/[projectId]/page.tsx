import { fetchProjectByIdPublic, markProjectFundedByClient } from '@/app/lib/coredon-data';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { stripe } from '@/app/lib/stripe';
import ClientProjectView from '@/app/ui/dashboard/client-project-view';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ session_id?: string; funded?: string }>;
}) {
  const { projectId } = await params;
  const { session_id, funded } = await searchParams;

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

  return <ClientProjectView project={project} />;
}
