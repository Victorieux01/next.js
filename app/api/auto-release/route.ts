import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { PLAN_CONFIGS, type PlanKey } from '@/app/lib/coredon-types';

export const dynamic = 'force-dynamic';

// Vercel Cron — runs daily at 04:00 UTC.
// Auto-releases Funded projects that have been waiting past their plan's
// auto-release window (7 days for Starter, 14 days for Pro/Studio).
// vercel.json: { "crons": [{ "path": "/api/auto-release", "schedule": "0 4 * * *" }] }
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { data: projects, error } = await supabase
      .from('coredon_projects')
      .select('id, user_id, name, prepaid_date')
      .eq('status', 'Funded')
      .not('prepaid_date', 'is', null);

    if (error) throw new Error(error.message);
    if (!projects?.length) {
      return NextResponse.json({ released: 0, message: 'No funded projects found' });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let released = 0;

    for (const project of projects) {
      // Fetch user plan (default: starter → 7 days)
      const { data: settings } = await supabase
        .from('coredon_user_settings')
        .select('plan')
        .eq('user_id', project.user_id)
        .single();

      const plan = ((settings?.plan as PlanKey) in PLAN_CONFIGS ? settings?.plan : 'starter') as PlanKey;
      const autoReleaseDays = PLAN_CONFIGS[plan].autoReleaseDays;

      const prepaidDate = new Date(project.prepaid_date);
      const diffDays = Math.floor((today.getTime() - prepaidDate.getTime()) / 86_400_000);

      if (diffDays >= autoReleaseDays) {
        const { error: updateErr } = await supabase
          .from('coredon_projects')
          .update({ status: 'Released', released_date: todayStr, completion_date: todayStr })
          .eq('id', project.id)
          .eq('status', 'Funded');

        if (!updateErr) released++;
      }
    }

    return NextResponse.json({ released, checked: projects.length });
  } catch (err) {
    console.error('auto-release error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
