import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';

export async function POST(req: Request) {
  try {
    const { priceId, email } = await req.json();

    const customer = await stripe.customers.create({ email });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card', 'acss_debit'],
      payment_method_options: {
        acss_debit: {
          currency: 'cad',
          mandate_options: {
            payment_schedule: 'interval',
            interval_description: 'Monthly subscription',
            transaction_type: 'personal',
          },
        },
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}