import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import SubscriptionForm from '@/app/ui/subscription-form';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const PRICE_ID = 'price_xxxxxxxxxxxx'; // Replace with your actual Price ID

export default function SubscribePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          Subscribe to Coredon
        </h1>
        <Elements
          stripe={stripePromise}
          options={{
            mode: 'subscription',
            amount: 1000, // amount in cents ($10.00)
            currency: 'usd',
            paymentMethodTypes: ['card', 'us_bank_account'],
          }}
        >
          <SubscriptionForm priceId={PRICE_ID} />
        </Elements>
      </div>
    </main>
  );
}