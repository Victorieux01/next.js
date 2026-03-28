import { fetchAllClients } from '@/app/lib/coredon-data';
import ClientsClient from '@/app/ui/dashboard/clients-client';

export default async function ClientsPage() {
  const clients = await fetchAllClients();
  return <ClientsClient clients={clients} />;
}
