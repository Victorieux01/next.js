'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  customerName: string;
  amount: string;
  isPending: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  amount,
  isPending,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="text-center">
          <p className="text-4xl mb-4">🗑️</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Request Invoice Deletion
          </h2>
          <p className="text-gray-500 mb-2">
            You are requesting to delete the invoice for:
          </p>
          <p className="font-bold text-gray-800 text-lg">{customerName}</p>
          <p className="text-gray-600 mb-6">Amount: {amount}</p>
          <p className="text-sm text-gray-500 mb-6 bg-yellow-50 p-3 rounded-lg">
            ⚠️ An email will be sent to the customer asking them to confirm 
            the deletion. The invoice will be marked as pending deletion 
            until they respond.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50"
            >
              {isPending ? 'Sending...' : 'Send Deletion Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}