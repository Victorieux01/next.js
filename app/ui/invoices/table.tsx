import { fetchFilteredInvoices } from '@/app/lib/data';
import InvoicesTableClient from '@/app/ui/invoices/invoices-table-client';

export default async function InvoicesTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  const invoices = await fetchFilteredInvoices(query, currentPage);
  return <InvoicesTableClient invoices={invoices} />;
}