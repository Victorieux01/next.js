'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import SubscriptionForm from '@/app/ui/subscription-form';
import { XMarkIcon } from '@heroicons/react/24/outline';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const PLANS = [
  {
    name: 'Free',
    price: '$0 CAD',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_FREE_PRICE_ID!,
    features: ['Basic dashboard', 'Up to 5 invoices', 'Email support'],
    color: 'border-gray-200',
    buttonColor: 'bg-gray-500 hover:bg-gray-400',
    badge: null,
  },
  {
    name: 'Pro',
    price: '$10 CAD',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    features: ['Everything in Free', 'Unlimited invoices', 'Priority support'],
    color: 'border-blue-500',
    buttonColor: 'bg-blue-500 hover:bg-blue-400',
    badge: 'Most Popular',
  },
  {
    name: 'Studio',
    price: '$29 CAD',
    period: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID!,
    features: ['Everything in Pro', 'Team access', 'Custom branding', 'API access'],
    color: 'border-purple-500',
    buttonColor: 'bg-purple-500 hover:bg-purple-400',
    badge: 'Best Value',
  },
];

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
}: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    if (plan.name === 'Free') {
      onClose();
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          email: 'customer@example.com',
        }),
      });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error creating payment intent:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white p-8 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {!selectedPlan ? (
          <>
            {/* Header */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-800">
                Welcome to Coredon! 🎉
              </h2>
              <p className="mt-2 text-gray-500">
                Choose the plan that works best for you
              </p>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-xl border-2 ${plan.color} p-6`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-gray-800">
                    {plan.name}
                  </h3>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="mb-1 text-gray-500">{plan.period}</span>
                  </div>
                  <ul className="my-6 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <span className="text-green-500">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`${plan.buttonColor} w-full rounded-lg py-2 text-sm font-medium text-white transition-colors`}
                  >
                    {plan.name === 'Free' ? 'Get Started Free' : `Choose ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-gray-400">
              <button onClick={onClose} className="hover:underline">
                Skip for now, I'll decide later
              </button>
            </p>
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-500">Loading payment form...</p>
          </div>
        ) : clientSecret ? (
          <>
            <button
              onClick={() => { setSelectedPlan(null); setClientSecret(null); }}
              className="mb-4 text-sm text-blue-500 hover:underline"
            >
              ← Back to plans
            </button>
            <h2 className="mb-2 text-xl font-bold text-gray-800">
              {selectedPlan.name} Plan - {selectedPlan.price}{selectedPlan.period}
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              Enter your payment details below
            </p>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' },
              }}
            >
              <SubscriptionForm priceId={selectedPlan.priceId} />
            </Elements>
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-red-500">
              Something went wrong. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}