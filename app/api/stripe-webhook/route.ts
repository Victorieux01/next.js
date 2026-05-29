import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/app/lib/stripe';
import supabase from '@/app/lib/supabase';

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

    // payment_method_types is an array on the session
    const rawMethod = (session.payment_method_types as string[] | undefined)?.[0] ?? 'card';
    const prepaidMethod = rawMethod === 'acss_debit' ? 'ACSS / EFT' : 'Stripe';

    const { error } = await supabase
      .from('coredon_projects')
      .update({ status: 'Funded', prepaid_date: today, prepaid_method: prepaidMethod })
      .eq('id', projectId)
      .eq('status', 'Pending');

    if (error) console.error('stripe-webhook DB update error:', error.message);
  }

  return NextResponse.json({ received: true });
}
