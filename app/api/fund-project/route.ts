'use server';
import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';

export async function POST(req: Request) {
  try {
    const { projectId, amount, email, projectName } = await req.json();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://coredon.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Escrow – ${projectName}`,
              description: 'Funds held in escrow until you approve the deliverables.',
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: { projectId },
      },
      metadata: { projectId },
      success_url: `${appUrl}/client/${projectId}?funded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/client/${projectId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('fund-project error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 });
  }
}
