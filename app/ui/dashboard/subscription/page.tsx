'use client';

import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import SubscriptionForm from '@/app/ui/subscription-form';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const PLANS = [
  {
    name: 'Free',
    price: '$0/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_FREE_PRICE_ID!,
    features: ['Basic dashboard', 'Up to 5 invoices', 'Email support'],
    color: 'bg-gray-100',
    buttonColor: 'bg-gray-500 hover:bg-gray-400',
  },
  {
    name: 'Pro',
    price: '$10/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    features: ['Everything in Free', 'Unlimited invoices', 'Priority support'],
    color: 'bg-blue-50',
    buttonColor: 'bg-blue-500 hover:bg-blue-400',
  },
  {
    name: 'Studio',
    price: '$29/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID!,
    features: ['Everything in Pro', 'Team access', 'Custom branding', 'API access'],
    color: 'bg-purple-50',
    buttonColor: 'bg-purple-500 hover:bg-purple-400',
  },
];

export default function SubscribePage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <h1 className="mb-2 text-3xl font-bold text-gray-800">
        Choose your plan
      </h1>
      <p className="mb-10 text-gray-500">
        Upgrade or downgrade at any time
      </p>

      {/* Plan selection cards */}
      {!selectedPlan && (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`${plan.color} flex flex-col rounded-lg p-6 shadow-md`}
            >
              <h2 className="mb-1 text-xl font-bold text-gray-800">
                {plan.name}
              </h2>
              <p className="mb-4 text-2xl font-bold text-gray-900">
                {plan.price}
              </p>
              <ul className="mb-6 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSelectedPlan(plan.priceId)}
                className={`${plan.buttonColor} w-full rounded-lg py-2 text-sm font-medium text-white transition-colors`}
              >
                {plan.name === 'Free' ? 'Get Started' : `Choose ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Checkout form after plan selection */}
      {selectedPlan && (
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <button
            onClick={() => setSelectedPlan(null)}
            className="mb-4 text-sm text-blue-500 hover:underline"
          >
            ← Back to plans
          </button>
          <h2 className="mb-6 text-xl font-bold text-gray-800">
            Complete your subscription
          </h2>
          <Elements
            stripe={stripePromise}
            options={{
              mode: 'subscription',
              amount: 1000,
              currency: 'usd',
              paymentMethodTypes: ['card', 'us_bank_account'],
            }}
          >
            <SubscriptionForm priceId={selectedPlan} />
          </Elements>
        </div>
      )}
    </main>
  );
}