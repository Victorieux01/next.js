'use client';

import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { requestInvoiceDeletion } from '@/app/lib/actions';
import DeleteConfirmationModal from '@/app/ui/invoices/delete_confirmation_modal';
import { formatCurrency } from '@/app/lib/utils';

import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CreateInvoice() {
  return (
    <Link
      href="/dashboard/invoices/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">Create Invoice</span>
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function UpdateInvoice({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/invoices/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}

export function DeleteInvoice({
  id,
  customerName,
  amount,
}: {
  id: string;
  customerName: string;
  amount: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await requestInvoiceDeletion(id);
      setIsModalOpen(false);
    });
  };

  return (
    <>
      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        customerName={customerName}
        amount={formatCurrency(amount)}
        isPending={isPending}
      />
      <button
        onClick={() => setIsModalOpen(true)}
        className="rounded-md border p-2 hover:bg-gray-100"
      >
        <span className="sr-only">Delete</span>
        <TrashIcon className="w-4" />
      </button>
    </>
  );
}