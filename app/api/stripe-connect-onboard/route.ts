import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import { auth } from '@/auth';
import supabase from '@/app/lib/supabase';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { returnUrl } = await req.json();

  // Check for an existing connected account
  const { data: settings } = await supabase
    .from('coredon_user_settings')
    .select('stripe_account_id')
    .eq('user_id', session.user.id)
    .single();

  let accountId: string = settings?.stripe_account_id ?? '';

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: session.user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;

    await supabase
      .from('coredon_user_settings')
      .upsert({ user_id: session.user.id, stripe_account_id: accountId }, { onConflict: 'user_id' });
  }

  const accountLink = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: returnUrl,
    return_url:  returnUrl,
    type:        'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}
