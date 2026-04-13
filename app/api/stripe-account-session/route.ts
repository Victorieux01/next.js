import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import { auth } from '@/auth';
import supabase from '@/app/lib/supabase';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabase
    .from('coredon_user_settings')
    .select('stripe_account_id')
    .eq('user_id', session.user.id)
    .single();

  if (!data?.stripe_account_id) {
    return NextResponse.json({ error: 'no_account' }, { status: 404 });
  }

  const accountSession = await stripe.accountSessions.create({
    account: data.stripe_account_id,
    components: {
      account_management: { enabled: true },
      payouts:            { enabled: true, features: { instant_payouts: true, standard_payouts: true, edit_payout_schedule: true } },
      payments:           { enabled: true, features: { refund_management: true, dispute_management: true, capture_payments: true } },
    },
  });

  return NextResponse.json({ clientSecret: accountSession.client_secret });
}
