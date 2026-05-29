import { NextResponse } from 'next/server';
import supabase from '@/app/lib/supabase';
import { getJobProfile } from '@/app/lib/coredon-types';

export const dynamic = 'force-dynamic';

// Called by the browser after the B2 direct upload completes.
// Records the processing job in Supabase and wakes up the RunPod worker.
export async function POST(req: Request) {
  try {
    const { projectId, storageKey, fileName, fileSizeGb } = await req.json();

    if (!projectId || !storageKey) {
      return NextResponse.json({ error: 'Missing projectId or storageKey' }, { status: 400 });
    }

    const profile = getJobProfile(typeof fileSizeGb === 'number' ? fileSizeGb : 0);

    // Record job in DB (RunPod worker queries this table for pending work)
    const { data: job, error: jobErr } = await supabase
      .from('coredon_processing_jobs')
      .insert({
        project_id:        projectId,
        storage_key:       storageKey,
        file_name:         fileName ?? null,
        file_size_gb:      fileSizeGb ?? 0,
        status:            'queued',
        estimated_minutes: profile.estimatedMinutes,
      })
      .select('id')
      .single();

    if (jobErr) console.error('queue-ffmpeg-job insert error:', jobErr.message);

    // Set project status to Processing
    await supabase
      .from('coredon_projects')
      .update({ status: 'Processing' })
      .eq('id', projectId)
      .in('status', ['Pending', 'Funded', 'Revision', 'In Review']);

    // Wake up RunPod L4 worker
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    const runpodPodId  = process.env.RUNPOD_POD_ID;
    let runpodResult: unknown = null;

    if (runpodApiKey && runpodPodId) {
      try {
        const res = await fetch('https://api.runpod.io/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${runpodApiKey}`,
          },
          body: JSON.stringify({
            query: `
              mutation ResumePod($podId: String!) {
                podResume(input: { podId: $podId, gpuCount: 1 }) {
                  id
                  desiredStatus
                }
              }
            `,
            variables: { podId: runpodPodId },
          }),
        });
        runpodResult = await res.json();
      } catch (err) {
        console.error('RunPod wakeup error:', err);
      }
    }

    return NextResponse.json({
      queued:  true,
      jobId:   job?.id ?? null,
      profile,
      runpod:  runpodResult,
    });
  } catch (err) {
    console.error('queue-ffmpeg-job error:', err);
    return NextResponse.json({ error: 'Failed to queue job' }, { status: 500 });
  }
}
