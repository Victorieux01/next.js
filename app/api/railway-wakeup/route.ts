import { NextResponse } from 'next/server';
import { getJobProfile } from '@/app/lib/coredon-types';

export const dynamic = 'force-dynamic';

// Sends a wake-up signal to RunPod L4 before the upload starts so the FFmpeg
// worker pod is warm by the time the upload finishes (~30 sec cold start).
// Redis is preloaded with job params during the cold start window.
export async function POST(req: Request) {
  try {
    const { projectId, fileSizeGb } = await req.json();

    if (!projectId || typeof fileSizeGb !== 'number') {
      return NextResponse.json({ error: 'Missing projectId or fileSizeGb' }, { status: 400 });
    }

    const profile = getJobProfile(fileSizeGb);

    const runpodApiKey = process.env.RUNPOD_API_KEY;
    const runpodPodId  = process.env.RUNPOD_POD_ID;

    if (!runpodApiKey || !runpodPodId) {
      return NextResponse.json({
        queued: false,
        reason: 'RunPod not configured (RUNPOD_API_KEY / RUNPOD_POD_ID missing)',
        profile,
      });
    }

    // Resume the RunPod L4 Secure Cloud pod (scale-to-zero → warm).
    // The pod picks up the BullMQ job once it finishes the ~30 sec cold start.
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
              lastStatusChange
            }
          }
        `,
        variables: { podId: runpodPodId },
      }),
    });

    const data = await res.json();

    return NextResponse.json({
      queued: true,
      profile,
      runpod: data,
    });
  } catch (err) {
    console.error('runpod-wakeup error:', err);
    return NextResponse.json({ error: 'Failed to wake RunPod worker' }, { status: 500 });
  }
}
