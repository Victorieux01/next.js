import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// Records a client viewing event for legal evidence (Section 6 of architecture doc).
// Stored in coredon_viewing_logs — schema:
//   project_id text, session_id text, event_type text,
//   current_time float, seek_from float, ip_address text,
//   user_agent text, recorded_at timestamptz
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, sessionId, type: eventType, currentTime, seekFrom, timestamp } = body;

    if (!projectId || !eventType) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const userAgent = req.headers.get('user-agent') ?? '';

    await supabase.from('coredon_viewing_logs').insert({
      project_id:   projectId,
      session_id:   sessionId ?? null,
      event_type:   eventType,
      current_time: currentTime ?? null,
      seek_from:    seekFrom   ?? null,
      ip_address:   ip,
      user_agent:   userAgent,
      recorded_at:  timestamp  ?? new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Fail silently — log errors must never disrupt the viewer
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
