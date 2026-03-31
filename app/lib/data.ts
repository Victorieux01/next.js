import supabase from './supabase';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  try {
    const { data, error } = await supabase.from('revenue').select('*');
    if (error) throw error;
    return (data ?? []) as Revenue[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('amount, id, customers(name, image_url, email)')
      .order('date', { ascending: false })
      .limit(5);
    if (error) throw error;

    return (data ?? []).map((inv) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = inv.customers as any;
      return {
        id: inv.id,
        amount: formatCurrency(inv.amount),
        name: c?.name ?? '',
        email: c?.email ?? '',
        image_url: c?.image_url ?? '',
      } as LatestInvoiceRaw & { amount: string };
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    const [{ count: invoiceCount }, { count: customerCount }, { data: invoiceData }] =
      await Promise.all([
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('amount, status'),
      ]);

    const paid = (invoiceData ?? [])
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
    const pending = (invoiceData ?? [])
      .filter((i) => i.status === 'pending')
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      numberOfInvoices: invoiceCount ?? 0,
      numberOfCustomers: customerCount ?? 0,
      totalPaidInvoices: formatCurrency(paid),
      totalPendingInvoices: formatCurrency(pending),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(query: string, currentPage: number) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, amount, date, status, customers(name, email, image_url)')
      .order('date', { ascending: false });
    if (error) throw error;

    const q = query.toLowerCase();
    const filtered = (data ?? []).filter((inv) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = inv.customers as any;
      return (
        !q ||
        c?.name?.toLowerCase().includes(q) ||
        c?.email?.toLowerCase().includes(q) ||
        String(inv.amount).includes(q) ||
        inv.date?.includes(q) ||
        inv.status?.toLowerCase().includes(q)
      );
    });

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(offset, offset + ITEMS_PER_PAGE).map((inv) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = inv.customers as any;
      return {
        id: inv.id,
        amount: inv.amount,
        date: inv.date,
        status: inv.status,
        name: c?.name ?? '',
        email: c?.email ?? '',
        image_url: c?.image_url ?? '',
      } as InvoicesTable;
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('amount, date, status, customers(name, email)')
      .order('date', { ascending: false });
    if (error) throw error;

    const q = query.toLowerCase();
    const filtered = (data ?? []).filter((inv) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = inv.customers as any;
      return (
        !q ||
        c?.name?.toLowerCase().includes(q) ||
        c?.email?.toLowerCase().includes(q) ||
        String(inv.amount).includes(q) ||
        inv.date?.includes(q) ||
        inv.status?.toLowerCase().includes(q)
      );
    });

    return Math.ceil(filtered.length / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, customer_id, amount, status')
      .eq('id', id)
      .single();
    if (error) throw error;

    return {
      ...data,
      amount: data.amount / 100,
    } as InvoiceForm;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CustomerField[];
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, image_url, invoices(amount, status)')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name', { ascending: true });
    if (error) throw error;

    return (data ?? []).map((customer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoices = (customer.invoices as any[]) ?? [];
      const total_pending = invoices
        .filter((i) => i.status === 'pending')
        .reduce((sum: number, i) => sum + i.amount, 0);
      const total_paid = invoices
        .filter((i) => i.status === 'paid')
        .reduce((sum: number, i) => sum + i.amount, 0);
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
        total_invoices: invoices.length,
        total_pending: formatCurrency(total_pending),
        total_paid: formatCurrency(total_paid),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any as CustomersTableType;
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
