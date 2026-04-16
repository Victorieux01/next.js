import { fetchAllClients } from '@/app/lib/coredon-data';
import ClientsClient from '@/app/ui/dashboard/clients-client';
import { getSession } from '@/app/lib/session';
import { redirect } from 'next/navigation';

export default async function ClientsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const clients = await fetchAllClients(session.user.id);
  return <ClientsClient clients={clients} />;
}
