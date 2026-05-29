import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { sendPreviewEmail } from '@/app/lib/sendgrid';
import { generatePortalToken } from '@/app/lib/portal-token';

export const dynamic = 'force-dynamic';

// Called by the RunPod FFmpeg worker when processing completes.
// Requires WORKER_SECRET header: Authorization: Bearer <secret>
export async function POST(req: Request) {
  const workerSecret = process.env.WORKER_SECRET;
  if (workerSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${workerSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { jobId, projectId, previewStorageKey, status, errorMessage } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (status === 'error') {
      if (jobId) {
        await supabase
          .from('coredon_processing_jobs')
          .update({ status: 'failed', error_message: errorMessage ?? 'Unknown error', finished_at: now })
          .eq('id', jobId);
      }
      // Leave project in Processing — the worker retries up to 3×
      console.error(`FFmpeg job ${jobId} failed for project ${projectId}: ${errorMessage}`);
      return NextResponse.json({ received: true });
    }

    if (!previewStorageKey) {
      return NextResponse.json({ error: 'Missing previewStorageKey' }, { status: 400 });
    }

    const date = now.slice(0, 10);

    await Promise.all([
      // Record watermarked preview in files table (B2 key)
      supabase.from('coredon_project_files').insert({
        project_id: projectId,
        name:       'preview.mp4',
        date,
        type:       'video',
        url:        previewStorageKey,
      }),
      // Move project to In Review
      supabase.from('coredon_projects')
        .update({ status: 'In Review' })
        .eq('id', projectId)
        .eq('status', 'Processing'),
      // Mark job done
      jobId
        ? supabase.from('coredon_processing_jobs')
            .update({ status: 'done', preview_key: previewStorageKey, finished_at: now })
            .eq('id', jobId)
        : Promise.resolve(),
    ]);

    // Notify client by email
    const { data: project } = await supabase
      .from('coredon_projects')
      .select('name, email')
      .eq('id', projectId)
      .single();

    if (project?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://coredon.app';
      const token = generatePortalToken(projectId);
      sendPreviewEmail({
        clientEmail: project.email,
        clientName:  project.name,
        projectName: project.name,
        previewUrl:  `${appUrl}/client/${projectId}?token=${token}`,
      }).catch(err => console.error('Preview email error:', err));
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('worker-done error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
