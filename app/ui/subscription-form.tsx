'use client';

import { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';

export default function SubscriptionForm({ priceId }: { priceId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'An error occurred');
      setLoading(false);
      return;
    }

    const { paymentMethod, error: paymentError } =
      await stripe.createPaymentMethod({
        elements,
      });

    if (paymentError) {
      setError(paymentError.message ?? 'Payment failed');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@example.com', // replace with actual user email
        paymentMethodId: paymentMethod.id,
        priceId,
      }),
    });

    const data = await response.json();

    if (data.error) {
      setError(data.error);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-green-500 text-center p-4">
        Subscription created successfully!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-400 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Subscribe'}
      </button>
    </form>
  );
}