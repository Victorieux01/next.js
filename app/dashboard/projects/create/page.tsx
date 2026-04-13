import CreateProjectForm from '@/app/ui/dashboard/create-project-form';
import { fetchAllClients } from '@/app/lib/coredon-data';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function CreateProjectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const clients = await fetchAllClients(session.user.id);
  return <CreateProjectForm clients={clients} />;
}
