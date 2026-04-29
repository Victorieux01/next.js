import { fetchAllClients } from '@/app/lib/coredon-data';
import ClientsClient from '@/app/ui/dashboard/clients-client';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function ClientsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const userEmail = session.user.email?.toLowerCase() ?? '';
  const allClients = await fetchAllClients(session.user.id);
  const clients = allClients.filter(c => (c.email?.toLowerCase() ?? '') !== userEmail);
  return <ClientsClient clients={clients} />;
}
