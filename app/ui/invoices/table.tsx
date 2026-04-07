import { fetchFilteredInvoices } from '@/app/lib/data';
import InvoicesTableClient from '@/app/ui/invoices/invoices-table-client';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function InvoicesTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const invoices = await fetchFilteredInvoices(query, currentPage, session.user.id);
  return <InvoicesTableClient invoices={invoices} />;
}
