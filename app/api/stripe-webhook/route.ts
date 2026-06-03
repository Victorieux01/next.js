import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/app/lib/stripe';
import supabase from '@/app/lib/supabase';
import { mapPaymentMethod } from '@/app/lib/coredon-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const projectId = session.metadata?.projectId;
    if (!projectId) return NextResponse.json({ received: true });

    const today = new Date().toISOString().slice(0, 10);

    // Retrieve the PaymentIntent to get the actual method the client used
    let prepaidMethod = 'Credit / Debit Card';
    if (session.payment_intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
          expand: ['payment_method'],
        });
        const pmType = (pi.payment_method as Stripe.PaymentMethod | null)?.type ?? 'card';
        prepaidMethod = mapPaymentMethod(pmType);
      } catch { /* keep default */ }
    }

    const { error } = await supabase
      .from('coredon_projects')
      .update({ status: 'Funded', prepaid_date: today, prepaid_method: prepaidMethod })
      .eq('id', projectId)
      .eq('status', 'Pending');

    if (error) console.error('stripe-webhook DB update error:', error.message);
  }

  return NextResponse.json({ received: true });
}
